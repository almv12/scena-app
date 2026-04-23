export default async function handler(req, res) {
  var botToken = process.env.BOT_TOKEN
  var supabaseUrl = 'https://xkpnjuuxoqwklfviaaeo.supabase.co'
  var supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  var altToken = process.env.ALTEGIO_TOKEN
  var altCompany = process.env.ALTEGIO_COMPANY || '1167547'
  var action = req.query.action
  var DIRECTOR_ID = '672402'
  var headers = { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey, 'Content-Type': 'application/json' }

  try {

    // ═══ РАССЫЛКА ═══
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

    // ═══ УТРЕННЕЕ РАСПИСАНИЕ ПЕДАГОГАМ (08:00) ═══
    // Включает уроки из Altegio + Supabase schedule
    if (action === 'morning') {
      var today = new Date().toISOString().slice(0, 10)
      var dayOfWeek = new Date().getDay()
      var records = []
      try { records = await getRecords(altToken, altCompany, today, today) } catch(e) {}

      // Получаем локальные уроки из Supabase
      var localUrl = supabaseUrl + '/rest/v1/schedule?select=*&status=eq.active&or=(start_date.eq.' + today + ',and(repeat_weekly.eq.true,day_of_week.eq.' + dayOfWeek + '))'
      var lr = await fetch(localUrl, { headers: headers })
      var localLessons = await lr.json() || []

      var ur = await fetch(supabaseUrl + '/rest/v1/users?select=telegram_id,altegio_staff_id,full_name,id&role=eq.teacher', { headers: headers })
      var teachers = await ur.json()
      var sent = 0

      for (var i = 0; i < teachers.length; i++) {
        var t = teachers[i]
        if (!t.telegram_id) continue

        // Уроки из Altegio
        var myAltegio = t.altegio_staff_id ? records.filter(function(r) { return r.staff_id === t.altegio_staff_id }) : []

        // Уроки из Supabase
        var myLocal = localLessons.filter(function(l) { return l.teacher_id === t.id })

        var totalCount = myAltegio.length + myLocal.length
        if (totalCount === 0) continue

        var msg = '☀️ Доброе утро, ' + (t.full_name || '') + '!\n\n📋 Уроков сегодня: ' + totalCount + '\n\n'

        // Altegio уроки
        myAltegio.sort(function(a, b) { return a.date > b.date ? 1 : -1 })
        for (var j = 0; j < myAltegio.length; j++) {
          var r = myAltegio[j]
          var time = r.date ? r.date.slice(11, 16) : ''
          var client = r.client ? r.client.display_name : '—'
          var service = r.services && r.services[0] ? r.services[0].title : ''
          msg += '🕐 ' + time + ' — ' + client + ' (' + service + ')\n'
        }

        // Supabase уроки
        myLocal.sort(function(a, b) { return (a.lesson_time || '') > (b.lesson_time || '') ? 1 : -1 })
        for (var j = 0; j < myLocal.length; j++) {
          var l = myLocal[j]
          msg += '🕐 ' + (l.lesson_time || '') + ' — ' + (l.student_name || '—') + ' (' + (l.instrument || '') + ')\n'
        }

        msg += '\n📍 Не забудьте отметить check-in!\nХорошего дня! 🎵'
        try { await sendTg(botToken, t.telegram_id, msg); sent++ } catch(e) {}
      }
      return res.status(200).json({ ok: true, morning: sent })
    }

    // ═══ НАПОМИНАНИЕ УЧЕНИКАМ (каждый час, за 30-150 мин) ═══
    if (action === 'remind') {
      var today = new Date().toISOString().slice(0, 10)
      var dayOfWeek = new Date().getDay()
      var now = new Date()
      var sent = 0

      // Altegio уроки
      var records = []
      try { records = await getRecords(altToken, altCompany, today, today) } catch(e) {}

      for (var i = 0; i < records.length; i++) {
        var rec = records[i]
        var lessonTime = new Date(rec.datetime)
        var diff = (lessonTime - now) / 1000 / 60
        if (diff > 30 && diff < 150) {
          var phone = rec.client ? rec.client.phone : ''
          if (phone) {
            var udRes = await fetch(supabaseUrl + '/rest/v1/users?select=telegram_id&phone=eq.%2B' + phone + '&limit=1', { headers: headers })
            var ud = await udRes.json()
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

      // Supabase уроки — напоминание
      var localUrl = supabaseUrl + '/rest/v1/schedule?select=*&status=eq.active&or=(start_date.eq.' + today + ',and(repeat_weekly.eq.true,day_of_week.eq.' + dayOfWeek + '))'
      var lr = await fetch(localUrl, { headers: headers })
      var localLessons = await lr.json() || []

      for (var i = 0; i < localLessons.length; i++) {
        var l = localLessons[i]
        if (!l.student_name || !l.lesson_time) continue
        var parts = l.lesson_time.split(':')
        var lessonDate = new Date(today + 'T' + l.lesson_time + ':00+05:00')
        var diff = (lessonDate - now) / 1000 / 60
        if (diff > 30 && diff < 150) {
          // Найти telegram_id ученика
          var sRes = await fetch(supabaseUrl + '/rest/v1/users?select=telegram_id&full_name=eq.' + encodeURIComponent(l.student_name) + '&role=eq.student&limit=1', { headers: headers })
          var sData = await sRes.json()
          if (sData && sData[0] && sData[0].telegram_id) {
            var msg = '🎵 Напоминание!\n\nУ вас урок сегодня:\n📚 ' + (l.instrument || 'Урок') + '\n👨‍🏫 ' + (l.teacher_name || '') + '\n🕐 ' + l.lesson_time + '\n\nНе опаздывайте!'
            try { await sendTg(botToken, sData[0].telegram_id, msg); sent++ } catch(e) {}
          }
        }
      }

      return res.status(200).json({ ok: true, reminded: sent })
    }

    // ═══ ЗА 10 МИНУТ ДО УРОКА (каждые 15 мин) ═══
    if (action === 'before_lesson') {
      var today = new Date().toISOString().slice(0, 10)
      var dayOfWeek = new Date().getDay()
      var now = new Date()
      var sent = 0

      // Supabase уроки
      var localUrl = supabaseUrl + '/rest/v1/schedule?select=*&status=eq.active&or=(start_date.eq.' + today + ',and(repeat_weekly.eq.true,day_of_week.eq.' + dayOfWeek + '))'
      var lr = await fetch(localUrl, { headers: headers })
      var localLessons = await lr.json() || []

      for (var i = 0; i < localLessons.length; i++) {
        var l = localLessons[i]
        if (!l.lesson_time) continue
        var lessonDate = new Date(today + 'T' + l.lesson_time + ':00+05:00')
        var diff = (lessonDate - now) / 1000 / 60

        if (diff > 5 && diff <= 15) {
          // Уведомление ученику
          if (l.student_name) {
            var sRes = await fetch(supabaseUrl + '/rest/v1/users?select=telegram_id&full_name=eq.' + encodeURIComponent(l.student_name) + '&role=eq.student&limit=1', { headers: headers })
            var sData = await sRes.json()
            if (sData && sData[0] && sData[0].telegram_id) {
              try { await sendTg(botToken, sData[0].telegram_id, '⏰ Ваш урок через 10 минут!\n\n📚 ' + (l.instrument || '') + '\n🕐 ' + l.lesson_time); sent++ } catch(e) {}
            }
          }
          // Уведомление педагогу
          if (l.teacher_id) {
            var tRes = await fetch(supabaseUrl + '/rest/v1/users?select=telegram_id&id=eq.' + l.teacher_id + '&limit=1', { headers: headers })
            var tData = await tRes.json()
            if (tData && tData[0] && tData[0].telegram_id) {
              try { await sendTg(botToken, tData[0].telegram_id, '⏰ Урок через 10 минут!\n\n👤 ' + (l.student_name || '—') + '\n📚 ' + (l.instrument || '') + '\n🕐 ' + l.lesson_time); sent++ } catch(e) {}
            }
          }
        }
      }

      return res.status(200).json({ ok: true, before_lesson: sent })
    }

    // ═══ ВЕЧЕРНЕЕ НАПОМИНАНИЕ УЧЕНИКАМ (20:00) ═══
    if (action === 'evening') {
      var tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      var tomorrowStr = tomorrow.toISOString().slice(0, 10)
      var tomorrowDow = tomorrow.getDay()
      var sent = 0

      // Altegio
      var records = []
      try { records = await getRecords(altToken, altCompany, tomorrowStr, tomorrowStr) } catch(e) {}

      for (var i = 0; i < records.length; i++) {
        var rec = records[i]
        var phone = rec.client ? rec.client.phone : ''
        if (phone) {
          var udRes = await fetch(supabaseUrl + '/rest/v1/users?select=telegram_id&phone=eq.%2B' + phone + '&limit=1', { headers: headers })
          var ud = await udRes.json()
          if (ud && ud[0] && ud[0].telegram_id) {
            var time = rec.date ? rec.date.slice(11, 16) : ''
            var service = rec.services && rec.services[0] ? rec.services[0].title : 'Урок'
            try { await sendTg(botToken, ud[0].telegram_id, '📅 Завтра у вас урок!\n\n📚 ' + service + '\n🕐 ' + time + '\n\nДо встречи! 🎵'); sent++ } catch(e) {}
          }
        }
      }

      // Supabase
      var localUrl = supabaseUrl + '/rest/v1/schedule?select=*&status=eq.active&or=(start_date.eq.' + tomorrowStr + ',and(repeat_weekly.eq.true,day_of_week.eq.' + tomorrowDow + '))'
      var lr = await fetch(localUrl, { headers: headers })
      var localLessons = await lr.json() || []

      for (var i = 0; i < localLessons.length; i++) {
        var l = localLessons[i]
        if (!l.student_name) continue
        var sRes = await fetch(supabaseUrl + '/rest/v1/users?select=telegram_id&full_name=eq.' + encodeURIComponent(l.student_name) + '&role=eq.student&limit=1', { headers: headers })
        var sData = await sRes.json()
        if (sData && sData[0] && sData[0].telegram_id) {
          try { await sendTg(botToken, sData[0].telegram_id, '📅 Завтра у вас урок!\n\n📚 ' + (l.instrument || '') + '\n👨‍🏫 ' + (l.teacher_name || '') + '\n🕐 ' + (l.lesson_time || '') + '\n\nДо встречи! 🎵'); sent++ } catch(e) {}
        }
      }

      return res.status(200).json({ ok: true, evening: sent })
    }

    // ═══ ВЕЧЕРНИЙ ОТЧЁТ ДИРЕКТОРУ (21:00) ═══
    if (action === 'daily_report') {
      var today = new Date().toISOString().slice(0, 10)

      // Уроки за сегодня
      var clRes = await fetch(supabaseUrl + '/rest/v1/conducted_lessons?select=*&lesson_date=eq.' + today, { headers: headers })
      var todayLessons = await clRes.json() || []
      var approved = todayLessons.filter(function(l) { return l.status === 'approved' }).length
      var pending = todayLessons.filter(function(l) { return l.status === 'pending' }).length
      var total = todayLessons.length

      // Check-in за сегодня
      var ciRes = await fetch(supabaseUrl + '/rest/v1/checkins?select=*&check_in_at=gte.' + today, { headers: headers })
      var checkins = await ciRes.json() || []

      // Новые регистрации
      var regRes = await fetch(supabaseUrl + '/rest/v1/users?select=*&role=eq.pending&created_at=gte.' + today, { headers: headers })
      var newRegs = await regRes.json() || []

      // Все pending
      var allPendRes = await fetch(supabaseUrl + '/rest/v1/users?select=id&role=eq.pending', { headers: headers })
      var allPending = await allPendRes.json() || []

      var msg = '📊 Итоги дня — ' + today + '\n\n'
      msg += '📋 Уроков отмечено: ' + total + '\n'
      msg += '✅ Подтверждено: ' + approved + '\n'
      msg += '⏳ На проверке: ' + pending + '\n'
      msg += '📍 Check-in: ' + checkins.length + '\n'
      msg += '🆕 Новых заявок: ' + newRegs.length + '\n'
      msg += '👤 Ожидают подтверждения: ' + allPending.length + '\n'

      if (newRegs.length > 0) {
        msg += '\n🆕 Новые:\n'
        for (var i = 0; i < newRegs.length; i++) {
          msg += '• ' + (newRegs[i].full_name || '—') + ' ' + (newRegs[i].phone || '') + '\n'
        }
      }

      if (pending > 0) {
        msg += '\n⚠️ Есть непроверенные уроки!'
      }

      try { await sendTg(botToken, DIRECTOR_ID, msg) } catch(e) {}
      return res.status(200).json({ ok: true, daily_report: true })
    }

    // ═══ НЕДЕЛЬНЫЙ ОТЧЁТ ДИРЕКТОРУ (Пн 09:00) ═══
    if (action === 'weekly_report') {
      var now = new Date()
      var weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      var weekAgoStr = weekAgo.toISOString().slice(0, 10)
      var todayStr = now.toISOString().slice(0, 10)

      // Уроки за неделю
      var clRes = await fetch(supabaseUrl + '/rest/v1/conducted_lessons?select=*&status=eq.approved&lesson_date=gte.' + weekAgoStr, { headers: headers })
      var weekLessons = await clRes.json() || []

      // Новые ученики
      var newRes = await fetch(supabaseUrl + '/rest/v1/users?select=id&role=eq.student&created_at=gte.' + weekAgoStr, { headers: headers })
      var newStudents = await newRes.json() || []

      // Всего учеников
      var totalRes = await fetch(supabaseUrl + '/rest/v1/users?select=id&role=eq.student', { headers: headers })
      var totalStudents = await totalRes.json() || []

      // Check-in
      var ciRes = await fetch(supabaseUrl + '/rest/v1/checkins?select=id&check_in_at=gte.' + weekAgoStr, { headers: headers })
      var weekCheckins = await ciRes.json() || []

      var indiv = weekLessons.filter(function(l) { return l.lesson_type !== 'group' }).length
      var group = weekLessons.filter(function(l) { return l.lesson_type === 'group' }).length

      var msg = '📊 Итоги недели\n' + weekAgoStr + ' — ' + todayStr + '\n\n'
      msg += '📋 Уроков проведено: ' + weekLessons.length + '\n'
      msg += '   Индивид.: ' + indiv + ' | Групп.: ' + group + '\n'
      msg += '👤 Всего учеников: ' + totalStudents.length + '\n'
      msg += '🆕 Новых за неделю: ' + newStudents.length + '\n'
      msg += '📍 Check-in: ' + weekCheckins.length + '\n'
      msg += '\nХорошей недели! 💪'

      try { await sendTg(botToken, DIRECTOR_ID, msg) } catch(e) {}
      return res.status(200).json({ ok: true, weekly_report: true })
    }

    // ═══ ЭСКАЛАЦИЯ: ПЕДАГОГ НЕ CHECK-IN (каждые 30 мин) ═══
    if (action === 'no_checkin') {
      var today = new Date().toISOString().slice(0, 10)
      var dayOfWeek = new Date().getDay()
      var now = new Date()
      var sent = 0

      // Получаем педагогов с уроками сегодня
      var localUrl = supabaseUrl + '/rest/v1/schedule?select=teacher_id,teacher_name,lesson_time&status=eq.active&or=(start_date.eq.' + today + ',and(repeat_weekly.eq.true,day_of_week.eq.' + dayOfWeek + '))'
      var lr = await fetch(localUrl, { headers: headers })
      var todaySchedule = await lr.json() || []

      // Кто сделал check-in сегодня
      var ciRes = await fetch(supabaseUrl + '/rest/v1/checkins?select=teacher_id&check_in_at=gte.' + today, { headers: headers })
      var todayCheckins = await ciRes.json() || []
      var checkedInIds = todayCheckins.map(function(c) { return c.teacher_id })

      // Собираем уникальных педагогов с уроками
      var teachersWithLessons = {}
      todaySchedule.forEach(function(l) {
        if (!teachersWithLessons[l.teacher_id]) {
          teachersWithLessons[l.teacher_id] = { name: l.teacher_name, firstLesson: l.lesson_time }
        }
        if (l.lesson_time < teachersWithLessons[l.teacher_id].firstLesson) {
          teachersWithLessons[l.teacher_id].firstLesson = l.lesson_time
        }
      })

      // Проверяем: урок через 30 мин, а check-in нет
      for (var tid in teachersWithLessons) {
        if (checkedInIds.indexOf(tid) >= 0) continue // Уже check-in
        var info = teachersWithLessons[tid]
        var lessonDate = new Date(today + 'T' + info.firstLesson + ':00+05:00')
        var diff = (lessonDate - now) / 1000 / 60

        if (diff > 0 && diff <= 30) {
          try {
            await sendTg(botToken, DIRECTOR_ID, '⚠️ Педагог не отметил check-in!\n\n👨‍🏫 ' + (info.name || '—') + '\n🕐 Первый урок: ' + info.firstLesson + '\n⏰ Через ' + Math.round(diff) + ' мин')
            sent++
          } catch(e) {}
        }
      }

      return res.status(200).json({ ok: true, no_checkin: sent })
    }

    return res.status(200).json({ ok: true, actions: 'broadcast, morning, remind, before_lesson, evening, daily_report, weekly_report, no_checkin' })
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

