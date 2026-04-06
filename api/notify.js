export default async function handler(req, res) {
  var botToken = process.env.BOT_TOKEN
  var supabaseUrl = 'https://xkpnjuuxoqwklfviaaeo.supabase.co'
  var supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  var action = req.query.action
  var text = req.query.text
  var role = req.query.role || 'student'

  var headers = { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey, 'Content-Type': 'application/json' }

  try {
    if (action === 'broadcast' && text) {
      var url = supabaseUrl + '/rest/v1/users?select=telegram_id&telegram_id=neq.0'
      if (role !== 'all') url += '&role=eq.' + role
      var r = await fetch(url, { headers: headers })
      var users = await r.json()
      var sent = 0
      for (var i = 0; i < users.length; i++) {
        if (users[i].telegram_id) {
          try {
            await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: users[i].telegram_id, text: text })
            })
            sent++
          } catch (e) {}
        }
      }
      return res.status(200).json({ ok: true, sent: sent })
    }

    if (action === 'remind') {
      var today = new Date().toISOString().slice(0, 10)
      var altToken = process.env.ALTEGIO_TOKEN
      var altCompany = process.env.ALTEGIO_COMPANY || '1167547'
      var ar = await fetch('https://app.alteg.io/api/v1/records/' + altCompany + '?start_date=' + today + '&end_date=' + today, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.api.v2+json', 'Authorization': 'Bearer ' + altToken }
      })
      var ad = await ar.json()
      var records = ad.data || []
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
              var time = rec.date.slice(11, 16)
              var msg = '🎵 Напоминание!\n\nУ вас урок сегодня:\n📚 ' + service + '\n👨‍🏫 ' + teacher + '\n🕐 ' + time + '\n\nНе опаздывайте!'
              try {
                await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: ud[0].telegram_id, text: msg })
                })
                sent++
              } catch (e) {}
            }
          }
        }
      }
      return res.status(200).json({ ok: true, reminded: sent })
    }

    return res.status(200).json({ ok: true, message: 'use ?action=broadcast&role=student&text=... or ?action=remind' })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
