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
  const [editId, setEditId] = useState(null)
  const [rateEdit, setRateEdit] = useState(null)
  const [indivRate, setIndivRate] = useState('')
  const [groupRate, setGroupRate] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(function() { loadData() }, [page, dateFilter])

  async function loadData() {
    setLoading(true)
    if (page === 'home') {
      var r = await fetch('/api/altegio?action=records&date_from=' + dateFilter + '&date_to=' + dateFilter)
      var d = await r.json()
      if (d.ok) setRecords(d.records || [])
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
    setEditId(null); loadData()
  }

  async function linkStaff(userId, staffId) {
    await supabase.from('users').update({ altegio_staff_id: staffId, role: 'teacher' }).eq('id', userId)
    setEditId(null); loadData()
  }

  async function linkClient(userId, clientId) {
    await supabase.from('users').update({ altegio_client_id: clientId, role: 'student' }).eq('id', userId)
    setEditId(null); setSearchResults([]); setSearchPhone(''); loadData()
  }

  async function searchClients(query) {
    if (query.length < 3) return
    setSearching(true)
    var r = await fetch('/api/altegio?action=search&phone=' + encodeURIComponent(query))
    var d = await r.json()
    if (d.ok) setSearchResults(d.clients || [])
    setSearching(false)
  }

  async function saveRate(userId) {
    if (!indivRate || !groupRate) return
    var { data } = await supabase.from('teacher_rates').select('*').eq('teacher_id', userId).single()
    if (data) { await supabase.from('teacher_rates').update({ individual_rate: Number(indivRate), group_rate: Number(groupRate) }).eq('teacher_id', userId) }
    else { await supabase.from('teacher_rates').insert({ teacher_id: userId, individual_rate: Number(indivRate), group_rate: Number(groupRate) }) }
    setRateEdit(null); setIndivRate(''); setGroupRate('')
  }

  async function sendBroadcast() {
    if (!msgText.trim()) return
    setSending(true); setSendResult(null)
    var ids = users.filter(function(u) { return (msgRole === 'all' || u.role === msgRole) && u.telegram_id && u.telegram_id !== 0 })
    var sent = 0
    for (var i = 0; i < ids.length; i++) { try { await fetch('/api/webhook?action=notify&chat_id=' + ids[i].telegram_id + '&text=' + encodeURIComponent(msgText)); sent++ } catch(e) {} }
    setSending(false); setSendResult('Отправлено: ' + sent); setMsgText('')
  }

  function getAttLabel(att) {
    if (att === 1) return { text: 'Был', bg: 'var(--green-light)', color: 'var(--green)' }
    if (att === -1) return { text: 'Нет', bg: 'var(--red-light)', color: 'var(--red)' }
    return { text: 'Ждёт', bg: 'var(--gold-light)', color: 'var(--gold)' }
  }

  function getRoleBadge(role) {
    if (role === 'teacher') return { bg: 'var(--green-light)', color: 'var(--green)' }
    if (role === 'admin') return { bg: 'var(--blue-light)', color: 'var(--blue)' }
    if (role === 'pending') return { bg: 'var(--gold-light)', color: 'var(--gold)' }
    if (role === 'rejected') return { bg: 'var(--red-light)', color: 'var(--red)' }
    return { bg: 'var(--blue-light)', color: 'var(--blue)' }
  }

  if (page === 'home') {
    var byStaff = {}
    records.forEach(function(rec) { var name = rec.staff ? rec.staff.name : '—'; if (!byStaff[name]) byStaff[name] = []; byStaff[name].push(rec) })
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
          var recs = byStaff[name]; recs.sort(function(a,b){return a.date>b.date?1:-1})
          return (<div key={name}><div className="section-title">{name} ({recs.length})</div>{recs.map(function(rec) {
            var time = rec.date.slice(11,16); var client = rec.client ? rec.client.display_name : '—'
            var service = rec.services && rec.services[0] ? rec.services[0].title : ''; var badge = getAttLabel(rec.attendance)
            return (<div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:10}}><div style={{minWidth:45,textAlign:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--gold)'}}>{time}</div></div><div style={{width:1,height:30,background:'var(--border)'}} /><div style={{flex:1}}><div className="lesson-name" style={{fontSize:13}}>{client}</div><div className="lesson-sub">{service}</div></div><span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span></div>)
          })}</div>)
        })}
      </div>
    )
  }

  if (page === 'checkins') {
    return (<div className="page"><div className="section-title">Check-in</div>{checkins.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет записей</div>}{checkins.map(function(c) { var d = new Date(c.check_in_at); var mins = c.total_minutes || 0; return (<div className="card" key={c.id}><div style={{display:'flex',justifyContent:'space-between'}}><div className="lesson-name">{c.branch_name}</div>{mins > 0 && <span className="badge badge-done">{Math.floor(mins/60)}ч {mins%60}м</span>}</div><div className="lesson-sub">{d.toLocaleDateString('ru')} · {d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})} {c.check_out_at ? '— '+new Date(c.check_out_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}) : '(на смене)'}</div></div>) })}</div>)
  }

  if (page === 'notify') {
    return (<div className="page"><div className="section-title">Рассылка</div><div className="card"><div style={{display:'flex',gap:6,marginBottom:8}}><button className={'btn '+(msgRole==='all'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setMsgRole('all')}}>Все</button><button className={'btn '+(msgRole==='student'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setMsgRole('student')}}>Ученики</button><button className={'btn '+(msgRole==='teacher'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setMsgRole('teacher')}}>Педагоги</button></div><textarea value={msgText} onChange={function(e){setMsgText(e.target.value)}} placeholder="Текст..." rows={3} /><button className="btn btn-primary" style={{marginTop:8}} onClick={sendBroadcast} disabled={sending}>{sending?'...':'Отправить'}</button>{sendResult && <div style={{marginTop:8,fontSize:13,color:'var(--green)',textAlign:'center'}}>{sendResult}</div>}</div></div>)
  }

  if (page === 'users') {
    var pending = users.filter(function(u){return u.role==='pending'})
    var teachers = users.filter(function(u){return u.role==='teacher'})
    var students = users.filter(function(u){return u.role==='student'})
    var others = users.filter(function(u){return u.role!=='pending'&&u.role!=='teacher'&&u.role!=='student'})

    function renderUser(u) {
      var rb = getRoleBadge(u.role)
      var staffName = ''; if (u.altegio_staff_id) { var f = staff.find(function(s){return s.id===u.altegio_staff_id}); if (f) staffName = f.name }
      return (
        <div className="card" key={u.id}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="avatar">{u.full_name?u.full_name[0]:'?'}</div>
            <div style={{flex:1}}>
              <div className="lesson-name">{u.full_name}</div>
              <div className="lesson-sub">{u.phone} · @{u.username||'-'}</div>
              {staffName && <div className="lesson-sub" style={{color:'var(--green)'}}>Altegio: {staffName}</div>}
              {u.altegio_client_id && <div className="lesson-sub" style={{color:'var(--blue)'}}>Клиент ID: {u.altegio_client_id}</div>}
            </div>
            <span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:rb.bg,color:rb.color,fontWeight:600,cursor:'pointer'}} onClick={function(){setEditId(editId===u.id?null:u.id)}}>{u.role}</span>
          </div>

          {editId === u.id && (
            <div style={{marginTop:10,padding:10,background:'var(--bg3)',borderRadius:10}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Сменить роль:</div>
              <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                <button className="btn btn-secondary" style={{flex:1,padding:8,fontSize:12,minWidth:70}} onClick={function(){setEditId('client-'+u.id)}}>Ученик</button>
                <button className="btn btn-secondary" style={{flex:1,padding:8,fontSize:12,color:'var(--green)',minWidth:70}} onClick={function(){setEditId('staff-'+u.id)}}>Педагог</button>
                <button className="btn btn-secondary" style={{flex:1,padding:8,fontSize:12,minWidth:70}} onClick={function(){changeRole(u.id,'admin')}}>Админ</button>
                <button className="btn btn-secondary" style={{padding:8,fontSize:12,color:'var(--red)'}} onClick={function(){changeRole(u.id,'rejected')}}>✕</button>
              </div>
            </div>
          )}

          {editId === 'staff-'+u.id && (
            <div style={{marginTop:10,padding:10,background:'var(--bg3)',borderRadius:10}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Педагог в Altegio:</div>
              {staff.map(function(s) { return <button key={s.id} className="btn btn-secondary" style={{marginBottom:4,padding:8,fontSize:13,textAlign:'left'}} onClick={function(){linkStaff(u.id,s.id)}}>{s.name} — {s.specialization}</button> })}
              <button className="btn btn-secondary" style={{padding:6,fontSize:11,color:'var(--text3)',marginTop:4}} onClick={function(){setEditId(null)}}>Отмена</button>
            </div>
          )}

          {editId === 'client-'+u.id && (
            <div style={{marginTop:10,padding:10,background:'var(--bg3)',borderRadius:10}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Найти ученика в Altegio:</div>
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <input type="text" value={searchPhone} onChange={function(e){setSearchPhone(e.target.value)}} placeholder="Телефон или имя" style={{flex:1,padding:8,borderRadius:8,border:'1px solid var(--border)',fontSize:13,background:'var(--bg2)',color:'var(--text)'}} />
                <button className="btn btn-primary" style={{padding:'8px 12px',fontSize:13,width:'auto'}} onClick={function(){searchClients(searchPhone)}}>{searching?'...':'Найти'}</button>
              </div>
              {searchResults.length > 0 && searchResults.map(function(c) {
                return <button key={c.id} className="btn btn-secondary" style={{marginBottom:4,padding:8,fontSize:13,textAlign:'left'}} onClick={function(){linkClient(u.id, c.id)}}>{c.name} · {c.phone}</button>
              })}
              {searchResults.length === 0 && searchPhone.length > 2 && !searching && <div style={{fontSize:12,color:'var(--text3)'}}>Не найдено</div>}
              <div style={{display:'flex',gap:6,marginTop:6}}>
                <button className="btn btn-secondary" style={{flex:1,padding:6,fontSize:11}} onClick={function(){changeRole(u.id,'student');setEditId(null)}}>Без привязки</button>
                <button className="btn btn-secondary" style={{flex:1,padding:6,fontSize:11,color:'var(--text3)'}} onClick={function(){setEditId(null);setSearchResults([]);setSearchPhone('')}}>Отмена</button>
              </div>
            </div>
          )}

          {u.role === 'teacher' && (
            <div style={{marginTop:8}}>
              {rateEdit === u.id ? (
                <div style={{padding:10,background:'var(--bg3)',borderRadius:10}}>
                  <div style={{fontSize:13,marginBottom:6}}>Индив. ставка:</div>
                  <input type="number" value={indivRate} onChange={function(e){setIndivRate(e.target.value)}} placeholder="50000" style={{width:'100%',padding:8,borderRadius:8,border:'1px solid var(--border)',marginBottom:6,background:'var(--bg2)',color:'var(--text)',fontSize:14}} />
                  <div style={{fontSize:13,marginBottom:6}}>Групп. ставка:</div>
                  <input type="number" value={groupRate} onChange={function(e){setGroupRate(e.target.value)}} placeholder="70000" style={{width:'100%',padding:8,borderRadius:8,border:'1px solid var(--border)',marginBottom:6,background:'var(--bg2)',color:'var(--text)',fontSize:14}} />
                  <div style={{display:'flex',gap:6}}><button className="btn btn-primary" style={{flex:1,padding:8,fontSize:13}} onClick={function(){saveRate(u.id)}}>Сохранить</button><button className="btn btn-secondary" style={{flex:1,padding:8,fontSize:13}} onClick={function(){setRateEdit(null)}}>Отмена</button></div>
                </div>
              ) : (
                <button className="btn btn-secondary" style={{padding:6,fontSize:11}} onClick={function(){setRateEdit(u.id)}}>Установить ставки</button>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="page">
        {pending.length > 0 && <div className="section-title" style={{color:'var(--gold)'}}>Ожидают ({pending.length})</div>}
        {pending.map(renderUser)}
        {teachers.length > 0 && <div className="section-title">Педагоги ({teachers.length})</div>}
        {teachers.map(renderUser)}
        {students.length > 0 && <div className="section-title">Ученики ({students.length})</div>}
        {students.map(renderUser)}
        {others.length > 0 && <div className="section-title">Другие ({others.length})</div>}
        {others.map(renderUser)}
      </div>
    )
  }

  return <div className="page"><p>Загрузка...</p></div>
}
