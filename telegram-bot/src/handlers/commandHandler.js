import { buildWelcomeMessage } from '../utils/formatters.js';
import { config } from '../config.js';

export function handleStart(bot, msg) {
  bot.sendMessage(msg.chat.id, buildWelcomeMessage(), { parse_mode: 'Markdown' });
}

export async function handleLogs(bot, msg) {
  const chatId = msg.chat.id;
  try {
    const res = await fetch(`${config.BACKEND_URL}/api/ingest/logs`);
    const data = await res.json();

    if (data.logs?.length > 0) {
      const logList = data.logs.slice(0, 10).map(l => `• ${l.filename}`).join('\n');
      bot.sendMessage(chatId, `📋 *Últimos logs:*\n\n${logList}`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '📋 No hay logs de ingestión.');
    }
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error obteniendo logs: ${error.message}`);
  }
}
