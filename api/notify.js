export default async function handler(req, res) {
  var botToken = process.env.BOT_TOKEN
  var supabaseUrl = 'https://xkpnjuuxoqwklfviaaeo.supabase.co'
  var supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  var altToken = process.env.ALTEGIO_TOKEN
  var altCompany = process.env.ALTEGIO_COMPANY || '1167547'
  var action = req.query.action
  var headers = { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey, 'Content-Type': 'application/json' }

  try {
    if (action === 'broadcast') {
      var text = req.query.text
      var role = req.query.role || 'student'
      if (!text) return res.status(400).json({ ok: false, error: 'need text' })
      var url = supabaseUrl + '/rest/v1/users?select=telegram_id&telegram_id=neq.0'
      if (role !== 'all') url += '&role=eq.' + role
      var r = await fetch(url, { headers: headers })
      var users = await r.json()
      var sent = 0
      for (var i = 0; i < users.length; i++) {
        if (users[i].telegram_id) {
          try { await sendTg(botToken, users[i].telegram_id, text); sent++ } catch(e) {}
        }
      }
      return res.status(200).json({ ok: true, sent: sent })
    }

    if (action === 'remind') {
      var today = new Date().toISOString().slice(0, 10)
      var records = await getRecords(altToken, altCompany, today, today)
      var now = new Date()
      var sent = 0

      for (var i = 0; i < records.length; i++) {
        var rec = records[i]
        var lessonTime = new Date(rec.datetime)
        var diff = (lessonTime - now) / 1000 / 60

        if (diff > 30 && diff < 150) {
          var phone = rec.client ? rec.client.phone : ''
          if (phone) {
            var ur = await fetch(supabaseUrl + '/rest/v1/users?select=telegram_id&phone=eq.%2B' + phone + '&limit=1', { headers: headers })
            var ud = await ur.json()
            if (ud && ud[0] && ud[0].telegram_id) {
              var service = rec.services && rec.services[0] ? rec.services[0].title : 'Урок'
              var teacher = rec.staff ? rec.staff.name : ''
              var time = rec.date ? rec.date.slice(11, 16) : ''
              var msg = '🎵 Напоминание!\n\nУ вас урок сегодня:\n📚 ' + service + '\n👨‍🏫 ' + teacher + '\n🕐 ' + time + '\n\nНе опаздывайте!'
              try { await sendTg(botToken, ud[0].telegram_id, msg); sent++ } catch(e) {}
            }
          }
        }
      }
      return res.status(200).json({ ok: true, reminded: sent })
    }

    if (action === 'morning') {
      var today = new Date().toISOString().slice(0, 10)
      var records = await getRecords(altToken, altCompany, today, today)

      var ur = await fetch(supabaseUrl + '/rest/v1/users?select=telegram_id,altegio_staff_id,full_name&role=eq.teacher', { headers: headers })
      var teachers = await ur.json()
      var sent = 0

      for (var i = 0; i < teachers.length; i++) {
        var t = teachers[i]
        if (!t.telegram_id || !t.altegio_staff_id) continue
        var myLessons = records.filter(function(r) { return r.staff_id === t.altegio_staff_id })
        if (myLessons.length === 0) continue

        myLessons.sort(function(a, b) { return a.date > b.date ? 1 : -1 })
        var msg = '☀️ Доброе утро, ' + (t.full_name || '') + '!\n\n📋 Уроков сегодня: ' + myLessons.length + '\n\n'
        for (var j = 0; j < myLessons.length; j++) {
          var r = myLessons[j]
          var time = r.date ? r.date.slice(11, 16) : ''
          var client = r.client ? r.client.display_name : '—'
          var service = r.services && r.services[0] ? r.services[0].title : ''
          msg += '🕐 ' + time + ' — ' + client + ' (' + service + ')\n'
        }
        msg += '\nХорошего дня! 🎵'
        try { await sendTg(botToken, t.telegram_id, msg); sent++ } catch(e) {}
      }
      return res.status(200).json({ ok: true, morning: sent })
    }

    return res.status(200).json({ ok: true, message: 'actions: broadcast, remind, morning' })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}

async function sendTg(token, chatId, text) {
  await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  })
}

async function getRecords(token, company, from, to) {
  var r = await fetch('https://app.alteg.io/api/v1/records/' + company + '?start_date=' + from + '&end_date=' + to, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.api.v2+json', 'Authorization': 'Bearer ' + token }
  })
  var d = await r.json()
  return d.data || []
}
