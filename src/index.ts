// src/index.ts (概念性範例 - 載入邏輯)
import * as fs from 'fs';
import * as path from 'path';
import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import { BotClient } from './structures/BotClient';
import { Command } from './structures/Command';
import { Event } from './structures/Event';
import { Logger } from './utils/logger';

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // 開發用

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    throw new Error("缺少必要的環境變數 (TOKEN, CLIENT_ID, GUILD_ID)");
}

const client = new BotClient();

// --- 載入指令 ---
const commandsPath = path.join(__dirname, 'commands');
const commandsData: any[] = [];

// 載入指令的函數
const loadCommand = (filePath: string) => {
    try {
        const command = require(filePath).default as Command;
        if (command?.data) {
            client.commands.set(command.data.name, command);
            commandsData.push(command.data.toJSON());
            // Logger.info(`指令已載入: ${command.data.name}`);
        } else {
            Logger.warn(`檔案 ${filePath} 未正確導出指令。`);
        }
    } catch (error) {
        Logger.error(`載入指令 ${filePath} 時發生錯誤: ${error}`);
    }
};

// 載入直接在 commands 目錄下的指令
const rootCommandFiles = fs.readdirSync(commandsPath)
    .filter(file => (file.endsWith('.ts') || file.endsWith('.js')) && fs.statSync(path.join(commandsPath, file)).isFile());

for (const file of rootCommandFiles) {
    loadCommand(path.join(commandsPath, file));
}

// 載入子目錄中的指令
const folders = fs.readdirSync(commandsPath)
    .filter(item => fs.statSync(path.join(commandsPath, item)).isDirectory());

for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of commandFiles) {
        loadCommand(path.join(folderPath, file));
    }
}

// --- 註冊指令 ---
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        Logger.info(`開始更新 ${commandsData.length} 個應用程式 (/) 指令。`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), // 開發時
            // Routes.applicationCommands(CLIENT_ID), // 正式部署時
            { body: commandsData },
        );
        Logger.info(`成功更新應用程式 (/) 指令，共載入 ${commandsData.length} 個指令。`);
    } catch (error) {
        Logger.error(`更新指令時發生錯誤: ${error}`);
    }
})();


// --- 載入事件 ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath).default as Event<any>;
    if (event?.name) {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
            client.on(event.name, (...args) => event.execute(client, ...args));
        }
        Logger.info(`事件已載入: ${event.name}`);
    } else {
        Logger.warn(`檔案 ${filePath} 未正確導出事件。`);
    }
}

// --- 登入 ---
client.login(TOKEN);