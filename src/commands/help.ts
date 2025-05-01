import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../structures/Command';
import { Logger } from '../utils/logger';
import { BotClient } from '../structures/BotClient';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('顯示所有可用指令的說明'),
    
    async execute(interaction) {
        try {
            const client = interaction.client as BotClient;
            const commands = client.commands;
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📚 指令說明')
                .setDescription('以下是所有可用的指令：')
                .setTimestamp()
                .setFooter({ text: 'LiveATC Bot' });

            // 將指令分類
            const categories = new Map<string, string[]>();
            
            commands.forEach((command: Command) => {
                const category = command.data.name.includes('atc') ? 'ATC 相關' : '一般';
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                categories.get(category)?.push(`\`/${command.data.name}\` - ${command.data.description}`);
            });

            // 添加每個分類的指令到 embed
            categories.forEach((commands, category) => {
                embed.addFields({
                    name: `📌 ${category}`,
                    value: commands.join('\n'),
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            Logger.error(`執行 help 指令時發生錯誤: ${error}`);
            await interaction.reply('執行指令時發生錯誤，請稍後再試！');
        }
    }
}); 