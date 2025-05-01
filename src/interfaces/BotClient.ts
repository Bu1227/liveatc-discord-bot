import { Client, Collection } from 'discord.js';
import { Command } from '../structures/Command';

export interface BotClient extends Client {
    commands: Collection<string, Command>;
    logger: typeof import('../utils/logger').Logger;
} 