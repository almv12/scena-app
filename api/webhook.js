export default async function handler(req, res) {
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
    var botToken = process.env.BOT_TOKEN
    var url = 'https://api.telegram.org/bot' + botToken + '/sendMessage'

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Добро пожаловать в Сцену! 🎵\n\nНажмите кнопку ниже чтобы открыть приложение.',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Открыть Сцену', web_app: { url: 'https://scena-app-proba.vercel.app' } }
          ]]
        }
      })
    })
  }

  return res.status(200).json({ ok: true })
}
