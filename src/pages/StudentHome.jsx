import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import RateLesson from './RateLesson'

export default function StudentHome({ user }) {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, attended: 0, missed: 0 })
  const [rateLesson, setRateLesson] = useState(null)
  const [ratedIds, setRatedIds] = useState([])
  const [balance, setBalance] = useState(0)
  const [subType, setSubType] = useState('')
  // Перенос урока
  const [reschedule, setReschedule] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleMsg, setRescheduleMsg] = useState('')

  const firstName = user?.full_name?.split(' ')[0] || 'Ученик'

  useEffect(function() { loadData() }, [])

  async function loadData() {
    var { data: freshUser } = await supabase.from('users').select('lessons_balance, subscription_type').eq('id', user.id).single()
    if (freshUser) {
      setBalance(freshUser.lessons_balance || 0)
      setSubType(freshUser.subscription_type || '')
    }

    var clientId = user.altegio_client_id
    var phone = user.phone ? user.phone.replace('+', '') : ''
    var now = new Date()
    var start = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01'
    var end = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-31'
    var all = []

    if (clientId || phone) {
      try {
        var clientName = ''
        if (phone) {
          var sr = await fetch('/api/altegio?action=search&phone=' + phone)
          var sd = await sr.json()
          if (sd.ok && sd.clients && sd.clients.length > 0) {
            if (clientId) { var found = sd.clients.find(function(c){return c.id===clientId}); if (found) clientName = found.name }
            else { clientId = sd.clients[0].id; clientName = sd.clients[0].name }
          }
        }
        var rr = await fetch('/api/altegio?action=records&date_from=' + start + '&date_to=' + end)
        var rd = await rr.json()
        if (rd.ok && rd.records) {
          rd.records.forEach(function(rec) {
            if (!rec.client) return
            if ((clientId && rec.client.id === clientId) || (clientName && rec.client.display_name === clientName)) {
              all.push({ id: 'a-' + rec.id, date: rec.date, time: rec.date.slice(11,16), service: rec.services && rec.services[0] ? rec.services[0].title : '', teacher: rec.staff ? rec.staff.name : '', attendance: rec.attendance, source: 'altegio' })
            }
          })
        }
      } catch (e) {}
    }

    var { data: local } = await supabase.from('schedule').select('*').eq('student_name', user.full_name).eq('status', 'active')
    if (local) {
      local.forEach(function(item) {
        var lessonDate = item.start_date || start
        all.push({ id: 'l-' + item.id, scheduleId: item.id, date: lessonDate + 'T' + item.lesson_time + ':00', time: item.lesson_time, service: item.instrument, teacher: item.teacher_name, teacherId: item.teacher_id, attendance: 0, source: 'local', duration: item.lesson_duration, branchName: item.branch_name })
      })
    }

    all.sort(function(a,b) { return a.date > b.date ? 1 : -1 })
    setLessons(all)
    setStats({
      total: all.length,
      attended: all.filter(function(r){return r.attendance===1}).length,
      missed: all.filter(function(r){return r.attendance===-1}).length
    })

    var { data: rated } = await supabase.from('lesson_ratings').select('lesson_date,instrument').eq('student_id', user.id)
    if (rated) setRatedIds(rated.map(function(r){return r.lesson_date+r.instrument}))
    setLoading(false)
  }

  // Перенос урока
  async function doReschedule() {
    if (!reschedule || !rescheduleDate || !rescheduleTime) { setRescheduleMsg('Выберите дату и время'); return }

    // Проверка: минимум за 24 часа
    var lessonDateTime = new Date(reschedule.date)
    var hoursUntil = (lessonDateTime - new Date()) / 1000 / 60 / 60
    if (hoursUntil < 24) { setRescheduleMsg('Перенос возможен минимум за 24 часа до урока'); return }

    setRescheduling(true)
    setRescheduleMsg('')

    // Обновляем schedule
    var { error } = await supabase.from('schedule').update({
      start_date: rescheduleDate,
      lesson_time: rescheduleTime,
      day_of_week: new Date(rescheduleDate).getDay(),
    }).eq('id', reschedule.scheduleId)

    if (error) { setRescheduleMsg('Ошибка: ' + error.message); setRescheduling(false); return }

    // Записываем в schedule_exceptions
    await supabase.from('schedule_exceptions').insert({
      schedule_id: reschedule.scheduleId,
      original_date: reschedule.date.slice(0, 10),
      new_date: rescheduleDate,
      new_time: rescheduleTime,
      reason: 'Перенос учеником',
    }).catch(function() {})

    // Уведомление педагогу
    if (reschedule.teacherId) {
      var { data: teacher } = await supabase.from('users').select('telegram_id').eq('id', reschedule.teacherId).single()
      if (teacher && teacher.telegram_id) {
        var msg = '📅 Перенос урока!\n\n👤 ' + (user.full_name || '—') + '\n📚 ' + (reschedule.service || '') + '\n\n❌ Было: ' + reschedule.date.slice(0,10) + ' ' + reschedule.time + '\n✅ Стало: ' + rescheduleDate + ' ' + rescheduleTime
        try { await fetch('/api/webhook?action=notify&chat_id=' + teacher.telegram_id + '&text=' + encodeURIComponent(msg)) } catch(e) {}
      }
    }

    // Уведомление админу
    try {
      var adminMsg = '📅 Ученик перенёс урок!\n\n👤 ' + (user.full_name || '—') + '\n📚 ' + (reschedule.service || '') + '\n👨‍🏫 ' + (reschedule.teacher || '') + '\n\n❌ ' + reschedule.date.slice(0,10) + ' ' + reschedule.time + '\n✅ ' + rescheduleDate + ' ' + rescheduleTime
      await fetch('/api/webhook?action=notify&chat_id=672402&text=' + encodeURIComponent(adminMsg))
    } catch(e) {}

    setRescheduling(false)
    setReschedule(null)
    setRescheduleDate('')
    setRescheduleTime('')
    loadData()
  }

  function getAttBadge(att) {
    if (att === 1) return { text: 'Был', bg: 'var(--green-light)', color: 'var(--green)' }
    if (att === -1) return { text: 'Пропуск', bg: 'var(--red-light)', color: 'var(--red)' }
    return { text: 'Запланирован', bg: 'var(--gold-light)', color: 'var(--gold)' }
  }

  if (rateLesson) return <RateLesson user={user} lesson={rateLesson} onClose={function(){setRateLesson(null)}} />

  // Экран переноса
  if (reschedule) {
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setReschedule(null);setRescheduleMsg('')}}>← Назад</button><span>Перенос урока</span></div>
        <div className="card">
          <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>Перенести урок</div>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Текущее время:</div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:12}}>{reschedule.date.slice(0,10)} в {reschedule.time} — {reschedule.service}</div>

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Новая дата:</div>
          <input type="date" value={rescheduleDate} onChange={function(e){setRescheduleDate(e.target.value)}} min={new Date(Date.now()+86400000).toISOString().slice(0,10)} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,marginBottom:10,background:'var(--bg2)',color:'var(--text)'}} />

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Новое время:</div>
          <input type="time" value={rescheduleTime} onChange={function(e){setRescheduleTime(e.target.value)}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,marginBottom:10,background:'var(--bg2)',color:'var(--text)'}} />

          <div style={{fontSize:11,color:'var(--text3)',marginBottom:12}}>⚠️ Перенос возможен минимум за 24 часа до урока. Педагог и администратор получат уведомление.</div>

          {rescheduleMsg && <div style={{fontSize:13,color:'var(--red)',marginBottom:10,fontWeight:600}}>{rescheduleMsg}</div>}

          <button className="btn btn-primary" onClick={doReschedule} disabled={rescheduling} style={{opacity:rescheduling?0.6:1}}>
            {rescheduling ? 'Переносим...' : 'Перенести урок'}
          </button>
        </div>
      </div>
    )
  }

  var today = new Date().toISOString().slice(0,10)
  var todayLessons = lessons.filter(function(l){return l.date.slice(0,10)===today})
  var upcoming = lessons.filter(function(l){return l.date.slice(0,10)>today})
  var past = lessons.filter(function(l){return l.date.slice(0,10)<today && l.attendance===1})

  return (
    <div className="page">
      <div className="greeting"><h1>Привет, {firstName}!</h1><p>{loading?'Загрузка...':stats.total+' уроков в этом месяце'}</p></div>

      {/* Баланс */}
      <div className="card" style={{background:'linear-gradient(135deg, var(--gold-light), var(--gold))',color:'#fff',textAlign:'center',padding:16}}>
        <div style={{fontSize:11,opacity:0.85,textTransform:'uppercase',letterSpacing:1}}>Баланс уроков</div>
        <div style={{fontSize:36,fontWeight:800,margin:'4px 0'}}>{balance}</div>
        {subType && <div style={{fontSize:12,opacity:0.8}}>Пакет: {subType}</div>}
        {balance <= 0 && <div style={{fontSize:12,marginTop:6,fontWeight:600}}>⚠️ Продлите абонемент!</div>}
        {balance > 0 && balance <= 2 && <div style={{fontSize:12,marginTop:6,fontWeight:600}}>Осталось мало — продлите заранее</div>}
      </div>

      {/* Статистика */}
      <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
        <div><div style={{fontSize:20,fontWeight:700}}>{stats.total}</div><div style={{fontSize:11,color:'var(--text2)'}}>Всего</div></div>
        <div><div style={{fontSize:20,fontWeight:700,color:'var(--green)'}}>{stats.attended}</div><div style={{fontSize:11,color:'var(--text2)'}}>Посетил</div></div>
        <div><div style={{fontSize:20,fontWeight:700,color:'var(--red)'}}>{stats.missed}</div><div style={{fontSize:11,color:'var(--text2)'}}>Пропуски</div></div>
      </div>

      {/* Сегодня */}
      {todayLessons.length > 0 && <div><div className="section-title">Сегодня</div>{todayLessons.map(function(l) {
        var badge = getAttBadge(l.attendance)
        return (<div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'var(--gold)'}}>{l.time}</div></div>
          <div style={{width:1,height:36,background:'var(--border)'}} />
          <div style={{flex:1}}><div className="lesson-name">{l.service}</div><div className="lesson-sub">{l.teacher} <span style={{fontSize:9,color:l.source==='altegio'?'var(--blue)':'var(--gold)'}}>{l.source==='altegio'?'':'Доп.'}</span></div></div>
          <span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
        </div>)
      })}</div>}

      {/* Предстоящие + кнопка переноса */}
      {upcoming.length > 0 && <div><div className="section-title">Предстоящие</div>{upcoming.slice(0,5).map(function(l) {
        var date = l.date.slice(5,10).split('-').reverse().join('.')
        var canReschedule = l.source === 'local' && l.scheduleId
        return (<div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:14,fontWeight:700}}>{date}</div><div style={{fontSize:12,color:'var(--text3)'}}>{l.time}</div></div>
          <div style={{width:1,height:36,background:'var(--border)'}} />
          <div style={{flex:1}}><div className="lesson-name">{l.service}</div><div className="lesson-sub">{l.teacher}</div></div>
          {canReschedule && (
            <button className="btn btn-secondary" style={{width:'auto',padding:'5px 10px',fontSize:11}} onClick={function(){setReschedule(l);setRescheduleDate('');setRescheduleTime(l.time)}}>
              📅 Перенести
            </button>
          )}
        </div>)
      })}</div>}

      {/* Оценить */}
      {past.length > 0 && <div><div className="section-title">Оценить уроки</div>{past.slice(-5).reverse().map(function(l) {
        var date = l.date.slice(0,10)
        var alreadyRated = ratedIds.indexOf(date+l.service) >= 0
        return (<div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1}}><div className="lesson-name" style={{fontSize:13}}>{l.service}</div><div className="lesson-sub">{date.slice(5).split('-').reverse().join('.')} · {l.teacher}</div></div>
          {alreadyRated ? <span style={{fontSize:11,color:'var(--green)',fontWeight:600}}>⭐</span> : <button className="btn btn-secondary" style={{width:'auto',padding:'6px 12px',fontSize:12}} onClick={function(){setRateLesson({service:l.service,teacher:l.teacher,date:date})}}>Оценить</button>}
        </div>)
      })}</div>}

      {!loading && lessons.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Уроки не найдены. Обратитесь к администратору.</div>}
    </div>
  )
}

