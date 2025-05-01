import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { VoiceConnection, AudioPlayer } from '@discordjs/voice';
import { Command } from './Command'; // 稍後定義

export class BotClient extends Client {
    public commands: Collection<string, Command>;
    public voiceConnections: Collection<string, VoiceConnection>;
    public audioPlayers: Collection<string, AudioPlayer>;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates, // **必須**
                GatewayIntentBits.GuildMessages,    // 如果需要訊息指令
                GatewayIntentBits.MessageContent,  // 如果需要訊息指令
            ]
        });
        this.commands = new Collection();
        this.voiceConnections = new Collection();
        this.audioPlayers = new Collection();
        // this.config = require('../config').default; // 範例
    }

    // 可在此處加入載入指令/事件的方法，或在 handlers 中實現
    public async loadCommands() { /* ... */ }
    public async loadEvents() { /* ... */ }
}