import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  var botToken = process.env.BOT_TOKEN
  var supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xkpnjuuxoqwklfviaaeo.supabase.co'
  var supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  var action = req.query.action
  var role = req.query.role || 'student'
  var text = req.query.text

  if (action === 'broadcast' && text) {
    var supabase = createClient(supabaseUrl, supabaseKey)
    var query = supabase.from('users').select('telegram_id').neq('telegram_id', 0)
    if (role !== 'all') query = query.eq('role', role)
    var { data: users } = await query

    var sent = 0
    if (users) {
      for (var i = 0; i < users.length; i++) {
        if (users[i].telegram_id) {
          try {
            await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: users[i].telegram_id, text: text, parse_mode: 'HTML' })
            })
            sent++
          } catch (e) {}
        }
      }
    }
    return res.status(200).json({ ok: true, sent: sent })
  }

  if (action === 'remind') {
    var supabase = createClient(supabaseUrl, supabaseKey)
    var today = new Date().toISOString().slice(0, 10)
    var r = await fetch('https://app.alteg.io/api/v1/records/' + (process.env.ALTEGIO_COMPANY || '1167547') + '?start_date=' + today + '&end_date=' + today, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.api.v2+json',
        'Authorization': 'Bearer ' + (process.env.ALTEGIO_TOKEN || '')
      }
    })
    var data = await r.json()
    var records = data.data || []

    var now = new Date()
    var sent = 0
    for (var i = 0; i < records.length; i++) {
      var rec = records[i]
      var lessonTime = new Date(rec.datetime)
      var diff = (lessonTime - now) / 1000 / 60

      if (diff > 30 && diff < 150) {
        var phone = rec.client ? rec.client.phone : ''
        if (phone) {
          var { data: user } = await supabase.from('users').select('telegram_id').eq('phone', '+' + phone).single()
          if (user && user.telegram_id) {
            var service = rec.services && rec.services[0] ? rec.services[0].title : 'Урок'
            var teacher = rec.staff ? rec.staff.name : ''
            var time = rec.date.slice(11, 16)
            var msg = '🎵 Напоминание!\n\nУ вас урок сегодня:\n📚 ' + service + '\n👨‍🏫 ' + teacher + '\n🕐 ' + time + '\n\nНе опаздывайте!'
            try {
              await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: user.telegram_id, text: msg })
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
}
