import { Interaction } from 'discord.js';
import { Event } from '../structures/Event';
import { Logger } from '../utils/logger';
import { BotClient } from '../structures/BotClient';

export default new Event<'interactionCreate'>({
    name: 'interactionCreate',
    async execute(client: BotClient, interaction: Interaction) {
        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            Logger.error(`執行指令時發生錯誤: ${error}`);
            await interaction.reply('執行指令時發生錯誤，請稍後再試！');
        }
    }
});