const BOT_VERSION = 'v2.2.0';
const CHANNEL_URL = 'https://t.me/logic_sec';
const REMOTE_SCRIPT_URL = 'https://raw.githubusercontent.com/pxir029/update_bot/refs/heads/main/worker.js';
const OWNER_ID = '8833683786';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('OK');

    try {
      const update = await request.json();
      const message = update.message;
      if (!message?.chat?.id) return new Response('OK');

      const userId = String(message.from?.id || '');
      const text = (message.text || '').trim();

      // دستور دستی آپدیت فقط برای Owner
      if (userId === OWNER_ID && text === '/update') {
        const result = await checkAndAutoUpdate(env);
        await sendMessage(env.BOT_TOKEN, message.chat.id, result);
        return new Response('OK');
      }

      // پیام ثابت برای همه کاربران
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
    // دانلود اسکریپت ریموت بدون کش
    const remoteRes = await fetch(REMOTE_SCRIPT_URL, {
      headers: { 'Cache-Control': 'no-cache' },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    if (!remoteRes.ok) {
      return `❌ خطا در دانلود: HTTP ${remoteRes.status}`;
    }

    const remoteScript = await remoteRes.text();

    // استخراج نسخه از فایل ریموت
    const versionMatch = remoteScript.match(/BOT_VERSION\s*=\s*['"`]([^'"`]+)['"`]/);
    const remoteVersion = versionMatch ? versionMatch[1] : null;

    if (!remoteVersion) {
      return `❌ نسخه در فایل ریموت پیدا نشد.\n\n📄 ۲۰۰ کاراکتر اول:\n<code>${remoteScript.substring(0, 200)}</code>`;
    }

    if (remoteVersion === BOT_VERSION) {
      return `✅ نسخه‌ها یکسان هستند: <code>${BOT_VERSION}</code>\nنیازی به آپدیت نیست.`;
    }

    // بررسی متغیرهای الزامی
    if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_WORKER_NAME) {
      return `❌ متغیرهای CF_API_TOKEN، CF_ACCOUNT_ID یا CF_WORKER_NAME تنظیم نشده‌اند.`;
    }

    // ✅ آپلود با فرمت ES Module صحیح (رفع خطای 10021)
    const formData = new FormData();
    formData.append('script', new Blob([remoteScript], { type: 'application/javascript+module' }));
    formData.append('metadata', JSON.stringify({
      main_module: 'worker.js',
      compatibility_date: '2024-09-01',
      bindings: []
    }));

    const uploadRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/scripts/${env.CF_WORKER_NAME}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${env.CF_API_TOKEN}`,
          // ⚠️ Content-Type دستی ست نشود! FormData خودش boundary می‌سازد
        },
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return `❌ آپلود ناموفق: HTTP ${uploadRes.status}\n<code>${errText.substring(0, 300)}</code>`;
    }

    return [
      `✅ <b>آپدیت موفق!</b>`,
      `━━━━━━━━━━━━━━━`,
      `🔙 نسخه قبلی: <code>${BOT_VERSION}</code>`,
      `🆕 نسخه جدید: <code>${remoteVersion}</code>`,
      ``,
      `⏳ <i>حداکثر ۳۰ ثانیه طول می‌کشد تا تغییرات اعمال شود.</i>`
    ].join('\n');

  } catch (e) {
    return `❌ خطای غیرمنتظره: ${e.message}`;
  }
}

async function sendMessage(token, chatId, text, keyboard) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
    })
  });
}
