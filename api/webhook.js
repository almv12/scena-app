export default async function handler(req, res) {
  var botToken = process.env.BOT_TOKEN

  if (req.method === 'GET' && req.query.action === 'notify') {
    var chatId = req.query.chat_id
    var text = req.query.text
    if (!chatId || !text) return res.status(400).json({ ok: false, error: 'need chat_id and text' })
    await sendMessage(botToken, chatId, text)
    return res.status(200).json({ ok: true })
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true })
  }

  var body = req.body
  if (!body || !body.message) {
    return res.status(200).json({ ok: true })
  }

  var chatId = body.message.chat.id
  var text = body.message.text || ''

  if (text === '/start') {
    await sendMessage(botToken, chatId, 'Добро пожаловать в Сцену! 🎵\n\nНажмите кнопку ниже чтобы открыть приложение.', {
      inline_keyboard: [[
        { text: 'Открыть Сцену', web_app: { url: 'https://scena-app-proba.vercel.app' } }
      ]]
    })
  }

  if (text === '/schedule') {
    await sendMessage(botToken, chatId, '📅 Откройте приложение чтобы увидеть расписание:', {
      inline_keyboard: [[
        { text: 'Моё расписание', web_app: { url: 'https://scena-app-proba.vercel.app' } }
      ]]
    })
  }

  if (text === '/help') {
    await sendMessage(botToken, chatId, '🎵 Сцена — Музыкальная школа\n\n📅 /schedule — Расписание\n📊 /start — Открыть приложение\n❓ /help — Помощь\n\nПо вопросам: +998909689197')
  }

  return res.status(200).json({ ok: true })
}

async function sendMessage(token, chatId, text, replyMarkup) {
  var body = { chat_id: chatId, text: text, parse_mode: 'HTML' }
  if (replyMarkup) body.reply_markup = replyMarkup
  await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}
