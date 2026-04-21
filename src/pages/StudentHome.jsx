import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import RateLesson from './RateLesson'

export default function StudentHome({ user }) {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, attended: 0, missed: 0 })
  const [rateLesson, setRateLesson] = useState(null)
  const [ratedIds, setRatedIds] = useState([])
  const firstName = user?.full_name?.split(' ')[0] || 'Ученик'

  useEffect(function() { loadData() }, [])

  async function loadData() {
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
              all.push({
                id: 'a-' + rec.id,
                date: rec.date,
                time: rec.date.slice(11,16),
                service: rec.services && rec.services[0] ? rec.services[0].title : '',
                teacher: rec.staff ? rec.staff.name : '',
                attendance: rec.attendance,
                source: 'altegio'
              })
            }
          })
        }
      } catch (e) {}
    }

    var { data: local } = await supabase.from('schedule').select('*').eq('student_name', user.full_name).eq('status', 'active')
    if (local) {
      local.forEach(function(item) {
        // ФИКС: start_date вместо lesson_date
        var lessonDate = item.start_date || start
        all.push({
          id: 'l-' + item.id,
          date: lessonDate + 'T' + item.lesson_time + ':00',
          time: item.lesson_time,
          service: item.instrument,
          teacher: item.teacher_name,
          attendance: 0,
          source: 'local'
        })
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

  function getAttBadge(att) {
    if (att === 1) return { text: 'Был', bg: 'var(--green-light)', color: 'var(--green)' }
    if (att === -1) return { text: 'Пропуск', bg: 'var(--red-light)', color: 'var(--red)' }
    return { text: 'Запланирован', bg: 'var(--gold-light)', color: 'var(--gold)' }
  }

  if (rateLesson) return <RateLesson user={user} lesson={rateLesson} onClose={function(){setRateLesson(null)}} />

  var today = new Date().toISOString().slice(0,10)
  var todayLessons = lessons.filter(function(l){return l.date.slice(0,10)===today})
  var upcoming = lessons.filter(function(l){return l.date.slice(0,10)>today})
  var past = lessons.filter(function(l){return l.date.slice(0,10)<today && l.attendance===1})

  return (
    <div className="page">
      <div className="greeting"><h1>Привет, {firstName}!</h1><p>{loading?'Загрузка...':stats.total+' уроков в этом месяце'}</p></div>
      <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
        <div><div style={{fontSize:20,fontWeight:700}}>{stats.total}</div><div style={{fontSize:11,color:'var(--text2)'}}>Всего</div></div>
        <div><div style={{fontSize:20,fontWeight:700,color:'var(--green)'}}>{stats.attended}</div><div style={{fontSize:11,color:'var(--text2)'}}>Посетил</div></div>
        <div><div style={{fontSize:20,fontWeight:700,color:'var(--red)'}}>{stats.missed}</div><div style={{fontSize:11,color:'var(--text2)'}}>Пропуски</div></div>
      </div>

      {todayLessons.length > 0 && <div><div className="section-title">Сегодня</div>{todayLessons.map(function(l) {
        var badge = getAttBadge(l.attendance)
        return (<div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'var(--gold)'}}>{l.time}</div></div>
          <div style={{width:1,height:36,background:'var(--border)'}} />
          <div style={{flex:1}}><div className="lesson-name">{l.service}</div><div className="lesson-sub">{l.teacher} <span style={{fontSize:9,color:l.source==='altegio'?'var(--blue)':'var(--gold)'}}>{l.source==='altegio'?'':'Доп.'}</span></div></div>
          <span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
        </div>)
      })}</div>}

      {upcoming.length > 0 && <div><div className="section-title">Предстоящие</div>{upcoming.slice(0,5).map(function(l) {
        var date = l.date.slice(5,10).split('-').reverse().join('.')
        return (<div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:14,fontWeight:700}}>{date}</div><div style={{fontSize:12,color:'var(--text3)'}}>{l.time}</div></div>
          <div style={{width:1,height:36,background:'var(--border)'}} />
          <div style={{flex:1}}><div className="lesson-name">{l.service}</div><div className="lesson-sub">{l.teacher}</div></div>
        </div>)
      })}</div>}

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

