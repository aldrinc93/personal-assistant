import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import app from '../dist/app.js'

const originalFetch = globalThis.fetch
const originalBotToken = process.env.TELEGRAM_BOT_TOKEN
const originalWebhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET

function configureEnvironment() {
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
  process.env.TELEGRAM_WEBHOOK_SECRET = 'test-webhook-secret'
}

function webhookRequest(update, secret = 'test-webhook-secret') {
  return app.request('/telegram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': secret
    },
    body: JSON.stringify(update)
  })
}

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalBotToken === undefined) {
    delete process.env.TELEGRAM_BOT_TOKEN
  } else {
    process.env.TELEGRAM_BOT_TOKEN = originalBotToken
  }

  if (originalWebhookSecret === undefined) {
    delete process.env.TELEGRAM_WEBHOOK_SECRET
  } else {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalWebhookSecret
  }
})

test('echoes text to the incoming Telegram chat', async () => {
  configureEnvironment()
  let sentRequest
  globalThis.fetch = async (url, init) => {
    sentRequest = { url: String(url), init }
    return Response.json({ ok: true })
  }

  const response = await webhookRequest({
    update_id: 1,
    message: { chat: { id: 12345 }, text: 'hello from Telegram' }
  })

  assert.equal(response.status, 200)
  assert.equal(sentRequest.url, 'https://api.telegram.org/bottest-bot-token/sendMessage')
  assert.equal(sentRequest.init.method, 'POST')
  assert.deepEqual(JSON.parse(sentRequest.init.body), {
    chat_id: 12345,
    text: 'hello from Telegram'
  })
})

test('rejects requests with an invalid webhook secret', async () => {
  configureEnvironment()
  globalThis.fetch = async () => {
    assert.fail('Telegram API must not be called for an unauthorized request')
  }

  const response = await webhookRequest({
    message: { chat: { id: 12345 }, text: 'hello' }
  }, 'wrong-secret')

  assert.equal(response.status, 401)
})

test('acknowledges updates without a text message without calling Telegram', async () => {
  configureEnvironment()
  globalThis.fetch = async () => {
    assert.fail('Telegram API must not be called for non-text updates')
  }

  const response = await webhookRequest({
    update_id: 2,
    message: { chat: { id: 12345 }, photo: [] }
  })

  assert.equal(response.status, 200)
})

test('reports Telegram API rejection to the webhook caller', async () => {
  configureEnvironment()
  globalThis.fetch = async () => Response.json({ ok: false }, { status: 200 })

  const response = await webhookRequest({
    message: { chat: { id: 12345 }, text: 'hello' }
  })

  assert.equal(response.status, 502)
})
