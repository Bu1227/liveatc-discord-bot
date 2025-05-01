import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { AudioPlayerStatus } from '@discordjs/voice';
import { Command } from '../structures/Command';
import { BotClient } from '../structures/BotClient';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('停止目前播放的音訊'),

    async execute(interaction: CommandInteraction, client: BotClient) {
        if (!interaction.guildId) {
            await interaction.reply({ content: '此指令只能在伺服器中使用。', ephemeral: true });
            return;
        }

        // 1. 獲取當前伺服器的播放器
        const player = client.audioPlayers.get(interaction.guildId);

        // 2. 檢查播放器是否存在以及是否正在播放
        if (!player || player.state.status === AudioPlayerStatus.Idle) {
            await interaction.reply({ content: '目前沒有播放任何音訊。', ephemeral: true });
            return;
        }

        // 3. 停止播放
        try {
            const stopped = player.stop(true); // true 確保觸發 Idle 狀態
            if (stopped) {
                await interaction.reply({ content: '已停止播放目前的音訊。', ephemeral: true });
                 console.log(`Playback stopped by command for guild ${interaction.guildId}`);
            } else {
                 await interaction.reply({ content: '無法停止播放，可能已經停止了。', ephemeral: true });
                 console.warn(`player.stop() returned false for guild ${interaction.guildId}`);
            }
        } catch (error) {
             console.error(`停止播放時發生錯誤 (Guild: ${interaction.guildId}):`, error);
             await interaction.reply({ content: '停止播放時發生錯誤。', ephemeral: true });
        }
    }
} as Command;