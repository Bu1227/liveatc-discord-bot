import { VoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, getVoiceConnection } from '@discordjs/voice';
import { Logger } from './logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

export class LiveATC {
    private static readonly BASE_URL = 'https://www.liveatc.net/';
    private static readonly CACHE_DIR = path.join(process.cwd(), 'cache');
    private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 小時

    private static async ensureCacheDir(): Promise<void> {
        if (!fs.existsSync(this.CACHE_DIR)) {
            fs.mkdirSync(this.CACHE_DIR, { recursive: true });
        }
    }

    private static async getStreamUrl(airport: string, frequency?: string): Promise<string> {
        try {
            // 檢查快取
            const cacheFile = path.join(this.CACHE_DIR, `${airport}${frequency ? `_${frequency}` : ''}.json`);
            if (fs.existsSync(cacheFile)) {
                const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
                if (Date.now() - cache.timestamp < this.CACHE_DURATION) {
                    return cache.url;
                }
            }

            // 從 liveatc.net 獲取實際的串流 URL
            const response = await axios.get(`${this.BASE_URL}feed.php?icao=${airport}${frequency ? `&freq=${frequency}` : ''}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data as string);
            const streamUrl = $('source').attr('src');

            if (!streamUrl) {
                throw new Error('找不到串流 URL');
            }

            // 儲存到快取
            await this.ensureCacheDir();
            fs.writeFileSync(cacheFile, JSON.stringify({
                url: streamUrl,
                timestamp: Date.now()
            }));

            return streamUrl;
        } catch (error) {
            Logger.error(`獲取串流 URL 失敗: ${error}`);
            throw error;
        }
    }

    public static async connect(connection: VoiceConnection, airport: string, frequency?: string): Promise<void> {
        try {
            const streamUrl = await this.getStreamUrl(airport, frequency);
            Logger.info(`正在連接到 ${airport}${frequency ? ` 頻率 ${frequency}` : ''}`);

            // 創建音頻播放器
            const player = createAudioPlayer();

            // 設置錯誤處理
            player.on('error', error => {
                Logger.error(`音頻播放器錯誤: ${error}`);
            });

            // 設置狀態變化處理
            player.on(AudioPlayerStatus.Idle, () => {
                Logger.info('音頻播放器閒置');
            });

            player.on(AudioPlayerStatus.Playing, () => {
                Logger.info('開始播放音頻');
            });

            // 創建音頻資源
            const resource = createAudioResource(streamUrl, {
                inlineVolume: true,
                inputType: StreamType.Arbitrary,
                metadata: {
                    title: `${airport}${frequency ? ` - ${frequency}` : ''}`,
                    source: 'liveatc.net'
                }
            });

            // 設置音量
            resource.volume?.setVolume(0.5);

            // 播放音頻
            player.play(resource);

            // 將播放器連接到語音連接
            connection.subscribe(player);

            // 儲存播放器到連接的 metadata
            (connection as any).player = player;

        } catch (error) {
            Logger.error(`連接失敗: ${error}`);
            throw error;
        }
    }

    public static async disconnect(guildId: string): Promise<void> {
        try {
            const connection = getVoiceConnection(guildId);
            if (connection) {
                const player = (connection as any).player;
                if (player) {
                    player.stop();
                }
                connection.destroy();
                Logger.info('已斷開連接');
            }
        } catch (error) {
            Logger.error(`斷開連接失敗: ${error}`);
            throw error;
        }
    }

    public static async searchAirports(query: string): Promise<Array<{ code: string; name: string }>> {
        try {
            // 檢查快取
            const cacheFile = path.join(this.CACHE_DIR, `search_${query}.json`);
            if (fs.existsSync(cacheFile)) {
                const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
                if (Date.now() - cache.timestamp < this.CACHE_DURATION) {
                    return cache.results;
                }
            }

            // 從 liveatc.net 搜尋機場
            const response = await axios.get(`${this.BASE_URL}search/?q=${query}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data as string);
            const results: Array<{ code: string; name: string }> = [];

            $('.airport').each((_: number, element: cheerio.Element) => {
                const code = $(element).find('.code').text().trim();
                const name = $(element).find('.name').text().trim();
                if (code && name) {
                    results.push({ code, name });
                }
            });

            // 儲存到快取
            await this.ensureCacheDir();
            fs.writeFileSync(cacheFile, JSON.stringify({
                results,
                timestamp: Date.now()
            }));

            return results;
        } catch (error) {
            Logger.error(`搜尋機場失敗: ${error}`);
            throw error;
        }
    }

    public static async getFrequencies(airport: string): Promise<Array<{ frequency: string; description: string }>> {
        try {
            // 檢查快取
            const cacheFile = path.join(this.CACHE_DIR, `frequencies_${airport}.json`);
            if (fs.existsSync(cacheFile)) {
                const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
                if (Date.now() - cache.timestamp < this.CACHE_DURATION) {
                    return cache.frequencies;
                }
            }

            // 從 liveatc.net 獲取頻率列表
            const response = await axios.get(`${this.BASE_URL}feed.php?icao=${airport}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data as string);
            const frequencies: Array<{ frequency: string; description: string }> = [];

            $('.frequency').each((_: number, element: cheerio.Element) => {
                const frequency = $(element).find('.freq').text().trim();
                const description = $(element).find('.desc').text().trim();
                if (frequency && description) {
                    frequencies.push({ frequency, description });
                }
            });

            // 儲存到快取
            await this.ensureCacheDir();
            fs.writeFileSync(cacheFile, JSON.stringify({
                frequencies,
                timestamp: Date.now()
            }));

            return frequencies;
        } catch (error) {
            Logger.error(`獲取頻率列表失敗: ${error}`);
            throw error;
        }
    }
} 