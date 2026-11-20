import { timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'

const app = new Hono()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function matchesSecret(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate)
  const expectedBytes = Buffer.from(expected)

  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes)
}

app.get('/', (c) => {
  return c.text('Hello hello!')
})

app.get('/marco', (c) => {
  return c.text('polo')
})

app.post('/telegram/webhook', async (c) => {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!webhookSecret) {
    return c.json({ error: 'Telegram webhook secret is not configured' }, 500)
  }

  const providedSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token')
  if (!providedSecret || !matchesSecret(providedSecret, webhookSecret)) {
    return c.text('Unauthorized', 401)
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return c.json({ error: 'Telegram bot token is not configured' }, 500)
  }

  let update: unknown
  try {
    update = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const message = isRecord(update) && isRecord(update.message) ? update.message : undefined
  const chat = message && isRecord(message.chat) ? message.chat : undefined
  const chatId = chat?.id
  const text = message?.text

  if (
    (typeof chatId !== 'number' && typeof chatId !== 'string') ||
    typeof text !== 'string' ||
    (message?.from && isRecord(message.from) && message.from.is_bot === true)
  ) {
    return c.body(null, 200)
  }

  let telegramResponse: Response
  try {
    telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    })
  } catch {
    console.error('Telegram sendMessage request failed')
    return c.json({ error: 'Telegram API request failed' }, 502)
  }

  let telegramResult: unknown
  try {
    telegramResult = await telegramResponse.json()
  } catch {
    console.error(`Telegram sendMessage returned invalid JSON (HTTP ${telegramResponse.status})`)
    return c.json({ error: 'Telegram API returned an invalid response' }, 502)
  }

  if (!telegramResponse.ok || !isRecord(telegramResult) || telegramResult.ok !== true) {
    console.error(`Telegram sendMessage failed (HTTP ${telegramResponse.status})`)
    return c.json({ error: 'Telegram API rejected the message' }, 502)
  }

  return c.body(null, 200)
})

export default app
