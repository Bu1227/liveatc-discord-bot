import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export class Command {
    public data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    public execute: (interaction: CommandInteraction) => Promise<void>;

    constructor(options: {
        data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
        execute: (interaction: CommandInteraction) => Promise<void>;
    }) {
        this.data = options.data;
        this.execute = options.execute;
    }
}