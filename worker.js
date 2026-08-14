const BOT_VERSION = 'v2.2.0';
const CHANNEL_URL = 'https://t.me/logic_sec';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('OK');

    try {
      const update = await request.json();
      const message = update.message;
      if (!message?.chat?.id) return new Response('OK');

      await sendMessage(
        env.BOT_TOKEN,
        message.chat.id,
        `🤖 ${BOT_VERSION}\n\n⚠️ ربات برای آپدیت کلی موقتاً خاموش هستش گل.\nلطفاً بعداً مراجعه کنید.`,
        [[{ text: '📢 اطلاع رسانی | logicSec', url: CHANNEL_URL }]]
      );
    } catch (e) {
      console.error(e);
    }

    return new Response('OK');
  }
};

async function sendMessage(token, chatId, text, keyboard) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: keyboard }
    })
  });
}
