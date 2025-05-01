import { Event } from '../structures/Event';
import { Logger } from '../utils/logger';

export default new Event<'ready'>({
    name: 'ready',
    once: true,
    async execute(client) {
        Logger.info(`已登入為 ${client.user?.tag}`);
    }
});