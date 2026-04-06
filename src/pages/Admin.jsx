import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin({ page }) {
  const [records, setRecords] = useState([])
  const [checkins, setCheckins] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0,10))
  const [msgText, setMsgText] = useState('')
  const [msgRole, setMsgRole] = useState('all')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  useEffect(function() { loadData() }, [page, dateFilter])

  async function loadData() {
    setLoading(true)
    if (page === 'home') {
      var r = await fetch('/api/altegio?action=records&date_from=' + dateFilter + '&date_to=' + dateFilter)
      var data = await r.json()
      if (data.ok) setRecords(data.records || [])
    }
    if (page === 'checkins') {
      var { data } = await supabase.from('checkins').select('*').order('check_in_at', { ascending: false }).limit(50)
      if (data) setCheckins(data)
    }
    if (page === 'users') {
      var { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (data) setUsers(data)
    }
    if (page === 'notify') {
      var { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (data) setUsers(data)
    }
    setLoading(false)
  }

  async function sendBroadcast() {
    if (!msgText.trim()) return
    setSending(true)
    setSendResult(null)
    var ids = users.filter(function(u) {
      if (msgRole === 'all') return u.telegram_id && u.telegram_id !== 0
      return u.role === msgRole && u.telegram_id && u.telegram_id !== 0
    })
    var sent = 0
    for (var i = 0; i < ids.length; i++) {
      try {
        await fetch('/api/webhook?action=notify&chat_id=' + ids[i].telegram_id + '&text=' + encodeURIComponent(msgText))
        sent++
      } catch(e) {}
    }
    setSending(false)
    setSendResult('Отправлено: ' + sent + ' из ' + ids.length)
    setMsgText('')
  }

  async function sendReminders() {
    setSending(true)
    setSendResult(null)
    var r = await fetch('/api/notify?action=remind')
    var d = await r.json()
    setSending(false)
    setSendResult('Напоминаний отправлено: ' + (d.reminded || 0))
  }

  function getAttLabel(att) {
    if (att === 1) return { text: 'Был', bg: 'var(--green-light)', color: 'var(--green)' }
    if (att === -1) return { text: 'Не пришёл', bg: 'var(--red-light)', color: 'var(--red)' }
    return { text: 'Ожидает', bg: 'var(--gold-light)', color: 'var(--gold)' }
  }

  if (page === 'home') {
    var byStaff = {}
    records.forEach(function(rec) {
      var name = rec.staff ? rec.staff.name : 'Без педагога'
      if (!byStaff[name]) byStaff[name] = []
      byStaff[name].push(rec)
    })
    var staffNames = Object.keys(byStaff).sort()
    var attended = records.filter(function(r) { return r.attendance === 1 }).length
    var missed = records.filter(function(r) { return r.attendance === -1 }).length

    return (
      <div className="page">
        <input type="date" value={dateFilter} onChange={function(e){setDateFilter(e.target.value)}} style={{width:'100%',padding:10,borderRadius:12,border:'1px solid var(--border)',fontSize:14,marginBottom:8,background:'var(--bg2)',color:'var(--text)'}} />
        <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
          <div><div style={{fontSize:20,fontWeight:700}}>{records.length}</div><div style={{fontSize:11,color:'var(--text2)'}}>Всего</div></div>
          <div><div style={{fontSize:20,fontWeight:700,color:'var(--green)'}}>{attended}</div><div style={{fontSize:11,color:'var(--text2)'}}>Были</div></div>
          <div><div style={{fontSize:20,fontWeight:700,color:'var(--red)'}}>{missed}</div><div style={{fontSize:11,color:'var(--text2)'}}>Пропуск</div></div>
        </div>
        {staffNames.map(function(name) {
          var recs = byStaff[name]
          recs.sort(function(a,b) { return a.date > b.date ? 1 : -1 })
          return (
            <div key={name}>
              <div className="section-title">{name} ({recs.length})</div>
              {recs.map(function(rec) {
                var time = rec.date.slice(11,16)
                var client = rec.client ? rec.client.display_name : '—'
                var service = rec.services && rec.services[0] ? rec.services[0].title : ''
                var badge = getAttLabel(rec.attendance)
                return (
                  <div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{minWidth:45,textAlign:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--gold)'}}>{time}</div></div>
                    <div style={{width:1,height:30,background:'var(--border)'}} />
                    <div style={{flex:1}}><div className="lesson-name" style={{fontSize:13}}>{client}</div><div className="lesson-sub">{service}</div></div>
                    <span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  if (page === 'checkins') {
    return (
      <div className="page">
        <div className="section-title">Check-in журнал</div>
        {checkins.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет записей</div>}
        {checkins.map(function(c) {
          var d = new Date(c.check_in_at)
          return (
            <div className="card" key={c.id}>
              <div className="lesson-name">{c.branch_name}</div>
              <div className="lesson-sub">{d.toLocaleDateString('ru')} · {d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (page === 'notify') {
    return (
      <div className="page">
        <div className="section-title">Отправить сообщение</div>
        <div className="card">
          <div style={{marginBottom:10}}>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Кому</div>
            <div style={{display:'flex',gap:6}}>
              <button className={'btn ' + (msgRole==='all'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setMsgRole('all')}}>Все</button>
              <button className={'btn ' + (msgRole==='student'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setMsgRole('student')}}>Ученики</button>
              <button className={'btn ' + (msgRole==='teacher'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setMsgRole('teacher')}}>Педагоги</button>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Текст сообщения</div>
            <textarea value={msgText} onChange={function(e){setMsgText(e.target.value)}} placeholder="Напишите сообщение..." rows={4} />
          </div>
          <button className="btn btn-primary" onClick={sendBroadcast} disabled={sending}>{sending ? 'Отправка...' : '📢 Отправить'}</button>
          {sendResult && <div style={{marginTop:8,fontSize:13,color:'var(--green)',textAlign:'center'}}>{sendResult}</div>}
        </div>

        <div className="section-title">Напоминания</div>
        <div className="card">
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:8}}>Отправить напоминание всем у кого урок через 30 мин — 2.5 часа</div>
          <button className="btn btn-secondary" onClick={sendReminders} disabled={sending}>{sending ? 'Отправка...' : '🔔 Отправить напоминания'}</button>
          {sendResult && page === 'notify' && <div style={{marginTop:8,fontSize:13,color:'var(--green)',textAlign:'center'}}>{sendResult}</div>}
        </div>

        <div className="section-title">Пользователи с Telegram ({users.filter(function(u){return u.telegram_id && u.telegram_id !== 0}).length})</div>
        {users.filter(function(u){return u.telegram_id && u.telegram_id !== 0}).map(function(u) {
          return (
            <div className="card" key={u.id} style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="avatar">{u.full_name ? u.full_name[0] : '?'}</div>
              <div style={{flex:1}}>
                <div className="lesson-name">{u.full_name}</div>
                <div className="lesson-sub">{u.role} · {u.telegram_id}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (page === 'users') {
    return (
      <div className="page">
        <div className="section-title">Пользователи ({users.length})</div>
        {users.map(function(u) {
          return (
            <div className="card" key={u.id} style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="avatar">{u.full_name ? u.full_name[0] : '?'}</div>
              <div style={{flex:1}}>
                <div className="lesson-name">{u.full_name}</div>
                <div className="lesson-sub">{u.phone} · @{u.username || '-'}</div>
              </div>
              <span className="badge badge-upcoming">{u.role}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return <div className="page"><p>Загрузка...</p></div>
}
