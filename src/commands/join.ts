import { SlashCommandBuilder, CommandInteraction, GuildMember, ChannelType } from 'discord.js';
import {
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus,
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer
} from '@discordjs/voice';
import { Command } from '../structures/Command';
import { BotClient } from '../structures/BotClient';
import { Logger } from '../utils/logger';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('讓機器人加入您所在的語音頻道'),

    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: '此指令只能在伺服器中使用。', ephemeral: true });
            return;
        }

        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel;
        const client = interaction.client as BotClient;

        // 1. 檢查使用者是否在語音頻道中
        if (!voiceChannel) {
            await interaction.reply({ content: '您需要先加入一個語音頻道才能使用此指令。', ephemeral: true });
            return;
        }

        // 2. 檢查是否為伺服器語音頻道
        if (voiceChannel.type !== ChannelType.GuildVoice) {
            await interaction.reply({ content: '請加入一個伺服器語音頻道。', ephemeral: true });
            return;
        }

        // 3. 檢查機器人是否已在該伺服器的某個頻道
        let connection = client.voiceConnections.get(interaction.guildId);

        if (connection) {
            // 如果已經在同一個頻道
            if (connection.joinConfig.channelId === voiceChannel.id && connection.state.status !== VoiceConnectionStatus.Destroyed && connection.state.status !== VoiceConnectionStatus.Disconnected) {
                await interaction.reply({ content: '我已經在這個頻道裡了。', ephemeral: true });
                return;
            }
            // 如果在不同頻道
            else if (connection.state.status !== VoiceConnectionStatus.Destroyed && connection.state.status !== VoiceConnectionStatus.Disconnected) {
                const channel = client.channels.cache.get(connection.joinConfig.channelId!);
                const channelName = channel?.type === ChannelType.GuildVoice || channel?.type === ChannelType.GuildText ? channel.name : '另一個';
                await interaction.reply({ content: `我目前在 ${channelName} 頻道中。請先使用 /leave。`, ephemeral: true });
                return;
            }
        }

        // 4. 嘗試加入頻道
        await interaction.deferReply();

        try {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild!.voiceAdapterCreator,
                selfDeaf: true,
            });

            client.voiceConnections.set(interaction.guildId, connection);

            // 5. 監聽連接狀態
            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                Logger.warn(`Connection disconnected for guild ${interaction.guildId}`);
                try {
                    await Promise.race([
                        entersState(connection!, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection!, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                    Logger.info(`Connection attempting to reconnect for guild ${interaction.guildId}`);
                } catch (error) {
                    Logger.info(`Connection permanently disconnected for guild ${interaction.guildId}, cleaning up.`);
                    if (connection?.state.status !== VoiceConnectionStatus.Destroyed) {
                        connection?.destroy();
                    }
                    client.voiceConnections.delete(interaction.guildId!);
                    const player = client.audioPlayers.get(interaction.guildId!);
                    player?.stop(true);
                    client.audioPlayers.delete(interaction.guildId!);
                }
            });

            connection.on(VoiceConnectionStatus.Destroyed, () => {
                Logger.info(`Connection destroyed for guild ${interaction.guildId}, cleaning up.`);
                client.voiceConnections.delete(interaction.guildId!);
                const player = client.audioPlayers.get(interaction.guildId!);
                player?.stop(true);
                client.audioPlayers.delete(interaction.guildId!);
            });

            // 6. 等待連接就緒
            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
            await interaction.editReply({ content: `已成功加入頻道: https://discord.com/channels/${interaction.guildId}/${voiceChannel.id}` });
            Logger.info(`Successfully joined ${voiceChannel.name} in guild ${interaction.guildId}`);

        } catch (error) {
            Logger.error(`加入頻道 ${voiceChannel.name} (Guild: ${interaction.guildId}) 失敗:`, error);
            connection?.destroy();
            client.voiceConnections.delete(interaction.guildId);
            client.audioPlayers.delete(interaction.guildId);
            await interaction.editReply({ content: '無法加入語音頻道，請稍後再試。' });
        }
    }
});