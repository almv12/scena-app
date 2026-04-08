import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin({ page }) {
  const [records, setRecords] = useState([])
  const [checkins, setCheckins] = useState([])
  const [users, setUsers] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0,10))
  const [msgText, setMsgText] = useState('')
  const [msgRole, setMsgRole] = useState('all')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [editUser, setEditUser] = useState(null)

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
    if (page === 'users' || page === 'notify') {
      var { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (data) setUsers(data)
      var s = await fetch('/api/altegio?action=staff')
      var sd = await s.json()
      if (sd.ok) setStaff(sd.staff || [])
    }
    setLoading(false)
  }

  async function changeRole(userId, newRole) {
    await supabase.from('users').update({ role: newRole }).eq('id', userId)
    loadData()
    setEditUser(null)
  }

  async function linkStaff(userId, staffId) {
    await supabase.from('users').update({ altegio_staff_id: staffId, role: 'teacher' }).eq('id', userId)
    loadData()
    setEditUser(null)
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

  function getAttLabel(att) {
    if (att === 1) return { text: 'Был', bg: 'var(--green-light)', color: 'var(--green)' }
    if (att === -1) return { text: 'Нет', bg: 'var(--red-light)', color: 'var(--red)' }
    return { text: 'Ждёт', bg: 'var(--gold-light)', color: 'var(--gold)' }
  }

  function getRoleStyle(role) {
    if (role === 'teacher') return { bg: 'var(--green-light)', color: 'var(--green)' }
    if (role === 'admin') return { bg: 'var(--blue-light)', color: 'var(--blue)' }
    if (role === 'pending') return { bg: 'var(--gold-light)', color: 'var(--gold)' }
    return { bg: 'var(--blue-light)', color: 'var(--blue)' }
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
        <input type="date" value={dateFilter} onChange={function(e){setDateFilter(e.target.value)}} style={{width:'100%',padding:10,borderRadius:12,border:'1px solid var(--border)',fontSize:14,marginBottom:8,background:'var(--bg2)',color:'var(--text)',fontFamily:'inherit'}} />
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
          <textarea value={msgText} onChange={function(e){setMsgText(e.target.value)}} placeholder="Текст сообщения..." rows={4} />
          <button className="btn btn-primary" style={{marginTop:8}} onClick={sendBroadcast} disabled={sending}>{sending ? 'Отправка...' : '📢 Отправить'}</button>
          {sendResult && <div style={{marginTop:8,fontSize:13,color:'var(--green)',textAlign:'center'}}>{sendResult}</div>}
        </div>
      </div>
    )
  }

  if (page === 'users') {
    var pending = users.filter(function(u) { return u.role === 'pending' })
    var active = users.filter(function(u) { return u.role !== 'pending' })

    return (
      <div className="page">
        {pending.length > 0 && <div className="section-title" style={{color:'var(--gold)'}}>Ожидают подтверждения ({pending.length})</div>}
        {pending.map(function(u) {
          return (
            <div className="card" key={u.id}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div className="avatar">{u.full_name ? u.full_name[0] : '?'}</div>
                <div style={{flex:1}}>
                  <div className="lesson-name">{u.full_name}</div>
                  <div className="lesson-sub">{u.phone} · @{u.username || '-'}</div>
                </div>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:'var(--gold-light)',color:'var(--gold)',fontWeight:600}}>pending</span>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-primary" style={{flex:1,padding:10,fontSize:13}} onClick={function(){changeRole(u.id, 'student')}}>Ученик</button>
                <button className="btn btn-secondary" style={{flex:1,padding:10,fontSize:13,borderColor:'var(--green)',color:'var(--green)'}} onClick={function(){setEditUser(u)}}>Педагог</button>
                <button className="btn btn-secondary" style={{flex:0.5,padding:10,fontSize:13,color:'var(--red)'}} onClick={function(){changeRole(u.id, 'rejected')}}>✕</button>
              </div>
              {editUser && editUser.id === u.id && (
                <div style={{marginTop:10,padding:10,background:'var(--bg3)',borderRadius:10}}>
                  <div style={{fontSize:13,color:'var(--text2)',marginBottom:6}}>Выберите педагога из Altegio:</div>
                  {staff.map(function(s) {
                    return (
                      <button key={s.id} className="btn btn-secondary" style={{marginBottom:4,padding:8,fontSize:13,textAlign:'left'}} onClick={function(){linkStaff(u.id, s.id)}}>
                        {s.name} — {s.specialization}
                      </button>
                    )
                  })}
                  <button className="btn btn-secondary" style={{padding:8,fontSize:13,color:'var(--text3)'}} onClick={function(){setEditUser(null)}}>Отмена</button>
                </div>
              )}
            </div>
          )
        })}

        <div className="section-title">Активные ({active.length})</div>
        {active.map(function(u) {
          var rs = getRoleStyle(u.role)
          return (
            <div className="card" key={u.id} style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="avatar">{u.full_name ? u.full_name[0] : '?'}</div>
              <div style={{flex:1}}>
                <div className="lesson-name">{u.full_name}</div>
                <div className="lesson-sub">{u.phone} · @{u.username || '-'}{u.altegio_staff_id ? ' · Altegio: ' + u.altegio_staff_id : ''}</div>
              </div>
              <span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:rs.bg,color:rs.color,fontWeight:600}}>{u.role}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return <div className="page"><p>Загрузка...</p></div>
}
