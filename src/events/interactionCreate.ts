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
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: '執行指令時發生錯誤，請稍後再試！', ephemeral: true });
                } else {
                    await interaction.reply({ content: '執行指令時發生錯誤，請稍後再試！', ephemeral: true });
                }
            } catch (replyError) {
                Logger.error(`回覆錯誤訊息時發生錯誤: ${replyError}`);
            }
        }
    }
});