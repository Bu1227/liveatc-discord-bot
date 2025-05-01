import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../structures/Command';
import { LiveATC } from '../../utils/liveatc';
import { Logger } from '../../utils/logger';
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('listen')
        .setDescription('收聽指定機場的 ATC 通訊')
        .addStringOption(option =>
            option.setName('airport')
                .setDescription('機場代碼（例如：KJFK, EHAM）')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('frequency')
                .setDescription('特定頻率（可選）')),

    async execute(interaction: CommandInteraction) {
        try {
            const member = interaction.member as GuildMember;
            const voiceChannel = member.voice.channel;

            if (!voiceChannel) {
                await interaction.reply('請先加入語音頻道！');
                return;
            }

            const airport = interaction.options.get('airport')?.value as string;
            const frequency = interaction.options.get('frequency')?.value as string;

            await interaction.deferReply();

            // 加入語音頻道
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            // 連接到 liveatc.net
            await LiveATC.connect(connection, airport, frequency);

            await interaction.editReply(`已連接到 ${airport}${frequency ? ` 頻率 ${frequency}` : ''}`);
        } catch (error) {
            Logger.error(`執行收聽指令時發生錯誤: ${error}`);
            await interaction.reply('發生錯誤，請稍後再試！');
        }
    }
}); 