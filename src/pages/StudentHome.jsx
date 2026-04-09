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
    if (!clientId && (!phone || phone === '-')) { setLoading(false); return }

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
      if (!clientId && !clientName) { setLoading(false); return }

      var now = new Date()
      var start = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01'
      var end = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-31'
      var rr = await fetch('/api/altegio?action=records&date_from=' + start + '&date_to=' + end)
      var rd = await rr.json()
      if (rd.ok && rd.records) {
        var my = rd.records.filter(function(rec) {
          if (!rec.client) return false
          if (clientId && rec.client.id === clientId) return true
          if (clientName && rec.client.display_name === clientName) return true
          return false
        })
        my.sort(function(a,b){return a.date>b.date?1:-1})
        setLessons(my)
        setStats({ total: my.length, attended: my.filter(function(r){return r.attendance===1}).length, missed: my.filter(function(r){return r.attendance===-1}).length })
      }
    } catch (e) {}

    var { data: rated } = await supabase.from('lesson_ratings').select('lesson_date,instrument').eq('student_id', user.id)
    if (rated) setRatedIds(rated.map(function(r){return r.lesson_date+r.instrument}))

    setLoading(false)
  }

  function getAttBadge(att) {
    if (att === 1) return { text: 'Был', bg: 'var(--green-light)', color: 'var(--green)' }
    if (att === -1) return { text: 'Пропуск', bg: 'var(--red-light)', color: 'var(--red)' }
    return { text: 'Запланирован', bg: 'var(--gold-light)', color: 'var(--gold)' }
  }

  if (rateLesson) {
    return <RateLesson user={user} lesson={rateLesson} onClose={function(){setRateLesson(null)}} />
  }

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

      {todayLessons.length > 0 && <div><div className="section-title">Сегодня</div>{todayLessons.map(function(rec) {
        var time = rec.date.slice(11,16); var service = rec.services&&rec.services[0]?rec.services[0].title:''; var teacher = rec.staff?rec.staff.name:''; var badge = getAttBadge(rec.attendance)
        return (<div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:12}}><div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'var(--gold)'}}>{time}</div></div><div style={{width:1,height:36,background:'var(--border)'}} /><div style={{flex:1}}><div className="lesson-name">{service}</div><div className="lesson-sub">{teacher}</div></div><span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span></div>)
      })}</div>}

      {upcoming.length > 0 && <div><div className="section-title">Предстоящие</div>{upcoming.slice(0,5).map(function(rec) {
        var date = rec.date.slice(5,10).split('-').reverse().join('.'); var time = rec.date.slice(11,16); var service = rec.services&&rec.services[0]?rec.services[0].title:''; var teacher = rec.staff?rec.staff.name:''
        return (<div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:12}}><div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:14,fontWeight:700}}>{date}</div><div style={{fontSize:12,color:'var(--text3)'}}>{time}</div></div><div style={{width:1,height:36,background:'var(--border)'}} /><div style={{flex:1}}><div className="lesson-name">{service}</div><div className="lesson-sub">{teacher}</div></div></div>)
      })}</div>}

      {past.length > 0 && <div><div className="section-title">Оценить уроки</div>{past.slice(-5).reverse().map(function(rec) {
        var date = rec.date.slice(0,10); var service = rec.services&&rec.services[0]?rec.services[0].title:''; var teacher = rec.staff?rec.staff.name:''
        var alreadyRated = ratedIds.indexOf(date+service) >= 0
        return (
          <div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}><div className="lesson-name" style={{fontSize:13}}>{service}</div><div className="lesson-sub">{date.slice(5).split('-').reverse().join('.')} · {teacher}</div></div>
            {alreadyRated ? <span style={{fontSize:11,color:'var(--green)',fontWeight:600}}>Оценён ⭐</span> : <button className="btn btn-secondary" style={{width:'auto',padding:'6px 12px',fontSize:12}} onClick={function(){setRateLesson({service:service,teacher:teacher,date:date})}}>Оценить</button>}
          </div>
        )
      })}</div>}

      {!loading && lessons.length === 0 && !user.altegio_client_id && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Аккаунт не привязан к Altegio. Обратитесь к администратору.</div>}
    </div>
  )
}
