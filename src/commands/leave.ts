import { SlashCommandBuilder } from 'discord.js';
import { VoiceConnectionStatus } from '@discordjs/voice';
import { Command } from '../structures/Command';
import { BotClient } from '../structures/BotClient';
import { Logger } from '../utils/logger';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('讓機器人離開目前的語音頻道'),

    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: '此指令只能在伺服器中使用。', ephemeral: true });
            return;
        }

        const client = interaction.client as BotClient;
        const connection = client.voiceConnections.get(interaction.guildId);

        if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
            await interaction.reply({ content: '我目前不在任何語音頻道中。', ephemeral: true });
            return;
        }

        const player = client.audioPlayers.get(interaction.guildId);
        if (player) {
            player.stop(true);
            Logger.info(`Stopped player for guild ${interaction.guildId} before leaving.`);
        }

        try {
            connection.destroy();
            Logger.info(`Destroyed voice connection for guild ${interaction.guildId}.`);
            await interaction.reply({ content: '已離開語音頻道。'});
        } catch (error) {
            Logger.error(`離開頻道時發生錯誤 (Guild: ${interaction.guildId}):`, error);
            await interaction.reply({ content: '離開頻道時發生錯誤，請稍後再試。', ephemeral: true });
            client.voiceConnections.delete(interaction.guildId);
            client.audioPlayers.delete(interaction.guildId);
        }
    }
});