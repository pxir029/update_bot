const BOT_VERSION = 'v2.3.0';
const CHANNEL_URL = 'https://t.me/logic_sec';
const REMOTE_SCRIPT_URL = 'https://raw.githubusercontent.com/pxir029/update_bot/refs/heads/main/worker.js';
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('OK');

    try {
      const update = await request.json();
      const message = update.message;
      if (!message?.chat?.id) return new Response('OK');
      const ownerId = '8833683786';
      const userId = String(message.from?.id || '');

      if (userId === ownerId && env.CF_API_TOKEN) {
        await checkAndAutoUpdate(env);
      }

      await sendMessage(
        env.BOT_TOKEN,
        message.chat.id,
        `⚠️ ربات برای آپدیت کلی موقتاً خاموش هستش گل.\nلطفاً بعداً مراجعه کنید.`,
        [[{ text: '📢 اطلاع رسانی | logicSec', url: CHANNEL_URL }]]
      );
    } catch (e) {
      console.error(e);
    }

    return new Response('OK');
  }
};

async function checkAndAutoUpdate(env) {
  try {
    // 1. دانلود اسکریپت ریموت
    const remoteRes = await fetch(REMOTE_SCRIPT_URL, { cf: { cacheTtl: 0 } });
    if (!remoteRes.ok) return;
    const remoteScript = await remoteRes.text();
    const versionMatch = remoteScript.match(/const\s+BOT_VERSION\s*=\s*['"]([^'"]+)['"]/);
    const remoteVersion = versionMatch ? versionMatch[1] : null;
    if (!remoteVersion || remoteVersion === BOT_VERSION) return;

    console.log(`🔄 New version detected: ${BOT_VERSION} → ${remoteVersion}`);

    const uploadRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/scripts/${env.CF_WORKER_NAME}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${env.CF_API_TOKEN}`,
          'Content-Type': 'application/javascript',
        },
        body: remoteScript,
      }
    );

    if (uploadRes.ok) {
      console.log(`✅ Auto-updated to ${remoteVersion}`);
    } else {
      const err = await uploadRes.text();
      console.error(`❌ Update failed: ${err}`);
    }
  } catch (e) {
    console.error('Auto-update error:', e);
  }
}

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
