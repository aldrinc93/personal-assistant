```
npm install
npm run dev
```

```
open http://localhost:3000
```

## Telegram echo webhook

The `POST /telegram/webhook` endpoint echoes incoming text messages through the Telegram Bot API. It requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`; the secret is checked against Telegram's `X-Telegram-Bot-Api-Secret-Token` header.

After deploying, register `https://YOUR_DOMAIN/telegram/webhook` with Telegram's [`setWebhook`](https://core.telegram.org/bots/api#setwebhook) method and pass the same value as `secret_token`. The bot replies with [`sendMessage`](https://core.telegram.org/bots/api#sendmessage). Non-text updates are acknowledged without a reply.
