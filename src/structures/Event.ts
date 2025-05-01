import { ClientEvents } from 'discord.js';
import { BotClient } from './BotClient';

export class Event<K extends keyof ClientEvents> {
    public name: K;
    public once: boolean;
    public execute: (client: BotClient, ...args: ClientEvents[K]) => Promise<void>;

    constructor(options: {
        name: K;
        once?: boolean;
        execute: (client: BotClient, ...args: ClientEvents[K]) => Promise<void>;
    }) {
        this.name = options.name;
        this.once = options.once ?? false;
        this.execute = options.execute;
    }
}
