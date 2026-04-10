export default async function handler(req, res) {
  var botToken = process.env.BOT_TOKEN

  if (req.method === 'GET' && req.query.action === 'notify') {
    var chatId = req.query.chat_id
    var text = req.query.text
    if (!chatId || !text) return res.status(400).json({ ok: false, error: 'need chat_id and text' })
    await sendMessage(botToken, chatId, text)
    return res.status(200).json({ ok: true })
  }

  if (req.method !== 'POST') return res.status(200).json({ ok: true })

  var body = req.body
  if (!body || !body.message) return res.status(200).json({ ok: true })

  var chatId = body.message.chat.id
  var text = body.message.text || ''

  if (text.startsWith('/start')) {
    var param = text.split(' ')[1] || ''

    if (param.startsWith('ref_')) {
      var referrerId = param.replace('ref_', '')
      var supabaseUrl = 'https://xkpnjuuxoqwklfviaaeo.supabase.co'
      var supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
      var headers = { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }

      try {
        await fetch(supabaseUrl + '/rest/v1/users?telegram_id=eq.' + chatId, {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify({ referred_by: Number(referrerId) })
        })

        var rr = await fetch(supabaseUrl + '/rest/v1/users?telegram_id=eq.' + referrerId + '&select=full_name', { headers: headers })
        var rd = await rr.json()
        var refName = rd && rd[0] ? rd[0].full_name : 'друг'

        await sendMessage(botToken, chatId, '🎵 Добро пожаловать в Сцену!\n\nВас пригласил(а) ' + refName + '! Запишитесь на бесплатный урок и вы оба получите бонус! 🎁', {
          inline_keyboard: [[
            { text: '🎵 Открыть Сцену', web_app: { url: 'https://scena-app-proba.vercel.app' } }
          ]]
        })

        await sendMessage(botToken, referrerId, '🎉 Ваш друг перешёл по вашей ссылке! Когда он запишется на урок — вы оба получите бонус! 🎁')
      } catch(e) {}

    } else {
      await sendMessage(botToken, chatId, '🎵 Добро пожаловать в Сцену!\n\nМузыкальная школа в Ташкенте.\nГитара, вокал, барабаны, фортепиано и другие инструменты.\n\nНажмите кнопку чтобы открыть приложение:', {
        inline_keyboard: [[
          { text: '🎵 Открыть Сцену', web_app: { url: 'https://scena-app-proba.vercel.app' } }
        ]]
      })
    }
  }

  if (text === '/schedule') {
    await sendMessage(botToken, chatId, '📅 Откройте приложение чтобы увидеть расписание:', {
      inline_keyboard: [[ { text: 'Моё расписание', web_app: { url: 'https://scena-app-proba.vercel.app' } } ]]
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
