import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

var SOURCES = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'website', label: 'Сайт' },
  { id: 'referral', label: 'Реферал' },
  { id: 'call', label: 'Звонок' },
  { id: 'sign', label: 'Вывеска' },
  { id: 'friends', label: 'Друзья' },
  { id: 'event', label: 'Мероприятие' },
  { id: 'other', label: 'Другое' },
]

var STATUSES = [
  { id: 'lead', label: 'Лид', color: '#9498A8' },
  { id: 'trial', label: 'Пробный', color: '#E08A3C' },
  { id: 'active', label: 'Активный', color: '#3BA676' },
  { id: 'frozen', label: 'Заморозка', color: '#4A7EC7' },
  { id: 'left', label: 'Ушёл', color: '#D4574E' },
  { id: 'returned', label: 'Вернулся', color: '#8B6CC7' },
]

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
  // НОВОЕ: редактирование имени
  const [nameEdit, setNameEdit] = useState(null)
  const [nameValue, setNameValue] = useState('')
  // НОВОЕ: редактирование статуса/источника
  const [detailEdit, setDetailEdit] = useState(null)
  // НОВОЕ: баланс и пакеты
  const [balanceEdit, setBalanceEdit] = useState(null)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [packages, setPackages] = useState([])

  useEffect(function() { loadData() }, [page, dateFilter])

  async function loadData() {
    setLoading(true)
    if (page === 'home') {
      try {
        var r = await fetch('/api/altegio?action=records&date_from=' + dateFilter + '&date_to=' + dateFilter)
        var d = await r.json()
        if (d.ok) setRecords(d.records || [])
      } catch(e) { setRecords([]) }
    }
    if (page === 'checkins') {
      var { data } = await supabase.from('checkins').select('*').order('check_in_at', { ascending: false }).limit(50)
      if (data) setCheckins(data)
    }
    if (page === 'users' || page === 'notify') {
      var { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (data) setUsers(data)
      try {
        var s = await fetch('/api/altegio?action=staff')
        var sd = await s.json()
        if (sd.ok) setStaff(sd.staff || [])
      } catch(e) { setStaff([]) }
      // Загружаем пакеты
      var { data: pkgs } = await supabase.from('lesson_packages').select('*').eq('is_active', true).order('lessons_count')
      if (pkgs) setPackages(pkgs)
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
    try {
      var r = await fetch('/api/altegio?action=search&phone=' + encodeURIComponent(query))
      var d = await r.json()
      if (d.ok) setSearchResults(d.clients || [])
    } catch(e) { setSearchResults([]) }
    setSearching(false)
  }

  async function saveRate(userId) {
    if (!indivRate || !groupRate) return
    var { data } = await supabase.from('teacher_rates').select('*').eq('teacher_id', userId).single()
    if (data) { await supabase.from('teacher_rates').update({ individual_rate: Number(indivRate), group_rate: Number(groupRate) }).eq('teacher_id', userId) }
    else { await supabase.from('teacher_rates').insert({ teacher_id: userId, individual_rate: Number(indivRate), group_rate: Number(groupRate) }) }
    setRateEdit(null); setIndivRate(''); setGroupRate('')
  }

  // НОВОЕ: сохранить имя
  async function saveName(userId) {
    if (!nameValue.trim()) return
    await supabase.from('users').update({ full_name: nameValue.trim() }).eq('id', userId)
    setNameEdit(null); setNameValue(''); loadData()
  }

  // НОВОЕ: сохранить статус + источник + заметки
  async function saveDetail() {
    if (!detailEdit) return
    var updates = {}
    if (detailEdit.student_status !== undefined) updates.student_status = detailEdit.student_status
    if (detailEdit.source !== undefined) updates.source = detailEdit.source
    if (detailEdit.notes !== undefined) updates.notes = detailEdit.notes
    if (detailEdit.branch_id !== undefined) updates.branch_id = detailEdit.branch_id || null
    if (detailEdit.frozen_until !== undefined) updates.frozen_until = detailEdit.frozen_until || null
    if (detailEdit.trial_date !== undefined) updates.trial_date = detailEdit.trial_date || null

    await supabase.from('users').update(updates).eq('id', detailEdit.id)
    setDetailEdit(null); loadData()
  }

  // НОВОЕ: пополнить баланс
  async function addBalance(userId, amount, pkgName) {
    if (!amount || amount <= 0) return
    var user = users.find(function(u) { return u.id === userId })
    var newBalance = (user?.lessons_balance || 0) + amount
    await supabase.from('users').update({
      lessons_balance: newBalance,
      subscription_type: pkgName || null
    }).eq('id', userId)
    setBalanceEdit(null); setBalanceAmount(''); loadData()
  }

  async function setBalanceDirect(userId) {
    var amount = parseInt(balanceAmount)
    if (isNaN(amount) || amount < 0) return
    await supabase.from('users').update({ lessons_balance: amount }).eq('id', userId)
    setBalanceEdit(null); setBalanceAmount(''); loadData()
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

  function getStatusInfo(status) {
    var found = STATUSES.find(function(s) { return s.id === status })
    return found || { id: status || 'active', label: status || 'Активный', color: '#3BA676' }
  }

  function getSourceLabel(source) {
    var found = SOURCES.find(function(s) { return s.id === source })
    return found ? found.label : source || '—'
  }

  // ═══ СТРАНИЦА: Уроки ═══
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
        {!loading && records.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Нет уроков. Altegio не подключён или нет записей.</div>}
      </div>
    )
  }

  // ═══ СТРАНИЦА: Check-in ═══
  if (page === 'checkins') {
    return (<div className="page"><div className="section-title">Check-in</div>{checkins.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет записей</div>}{checkins.map(function(c) { var d = new Date(c.check_in_at); var mins = c.total_minutes || 0; return (<div className="card" key={c.id}><div style={{display:'flex',justifyContent:'space-between'}}><div className="lesson-name">{c.branch_name}</div>{mins > 0 && <span className="badge badge-done">{Math.floor(mins/60)}ч {mins%60}м</span>}</div><div className="lesson-sub">{d.toLocaleDateString('ru')} · {d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})} {c.check_out_at ? '— '+new Date(c.check_out_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}) : '(на смене)'}</div></div>) })}</div>)
  }

  // ═══ СТРАНИЦА: Рассылка ═══
  if (page === 'notify') {
    return (<div className="page"><div className="section-title">Рассылка</div><div className="card"><div style={{display:'flex',gap:6,marginBottom:8}}><button className={'btn '+(msgRole==='all'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setMsgRole('all')}}>Все</button><button className={'btn '+(msgRole==='student'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setMsgRole('student')}}>Ученики</button><button className={'btn '+(msgRole==='teacher'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setMsgRole('teacher')}}>Педагоги</button></div><textarea value={msgText} onChange={function(e){setMsgText(e.target.value)}} placeholder="Текст..." rows={3} /><button className="btn btn-primary" style={{marginTop:8}} onClick={sendBroadcast} disabled={sending}>{sending?'...':'Отправить'}</button>{sendResult && <div style={{marginTop:8,fontSize:13,color:'var(--green)',textAlign:'center'}}>{sendResult}</div>}</div></div>)
  }

  // ═══ СТРАНИЦА: Юзеры ═══
  if (page === 'users') {
    var pending = users.filter(function(u){return u.role==='pending'})
    var teachers = users.filter(function(u){return u.role==='teacher'})
    var students = users.filter(function(u){return u.role==='student'})
    var others = users.filter(function(u){return u.role!=='pending'&&u.role!=='teacher'&&u.role!=='student'})

    function renderUser(u) {
      var rb = getRoleBadge(u.role)
      var staffName = ''; if (u.altegio_staff_id) { var f = staff.find(function(s){return s.id===u.altegio_staff_id}); if (f) staffName = f.name }
      var statusInfo = getStatusInfo(u.student_status)

      return (
        <div className="card" key={u.id}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="avatar">{u.full_name?u.full_name[0]:'?'}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span className="lesson-name">{u.full_name}</span>
                {/* Кнопка редактирования имени */}
                <span style={{cursor:'pointer',fontSize:14}} onClick={function(){setNameEdit(u.id);setNameValue(u.full_name||'')}}>✏️</span>
              </div>
              <div className="lesson-sub">{u.phone} · @{u.username||'-'}</div>
              {staffName && <div className="lesson-sub" style={{color:'var(--green)'}}>Altegio: {staffName}</div>}
              {u.altegio_client_id && <div className="lesson-sub" style={{color:'var(--blue)'}}>Клиент ID: {u.altegio_client_id}</div>}
              {/* НОВОЕ: бейджи статуса и источника */}
              <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap'}}>
                {u.role === 'student' && (
                  <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,background:statusInfo.color+'20',color:statusInfo.color,fontWeight:600}}>{statusInfo.label}</span>
                )}
                {u.source && (
                  <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,background:'#4A7EC720',color:'#4A7EC7',fontWeight:600}}>{getSourceLabel(u.source)}</span>
                )}
                {u.notes && (
                  <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,background:'#E08A3C20',color:'#E08A3C',fontWeight:600}} title={u.notes}>📝</span>
                )}
                {/* Баланс уроков */}
                {u.role === 'student' && (
                  <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,fontWeight:700,
                    background: (u.lessons_balance||0) <= 0 ? '#D4574E20' : (u.lessons_balance||0) <= 2 ? '#E08A3C20' : '#3BA67620',
                    color: (u.lessons_balance||0) <= 0 ? '#D4574E' : (u.lessons_balance||0) <= 2 ? '#E08A3C' : '#3BA676'
                  }}>🎟 {u.lessons_balance || 0} ур.</span>
                )}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
              <span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:rb.bg,color:rb.color,fontWeight:600,cursor:'pointer'}} onClick={function(){setEditId(editId===u.id?null:u.id)}}>{u.role}</span>
              {/* Кнопка статус/источник для учеников */}
              {u.role === 'student' && (
                <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,background:'var(--bg3)',color:'var(--text2)',cursor:'pointer'}} onClick={function(){setDetailEdit({id:u.id,student_status:u.student_status||'active',source:u.source||'',notes:u.notes||'',frozen_until:u.frozen_until||'',trial_date:u.trial_date||''})}}>⚙️ Подробнее</span>
              )}
              {/* Кнопка пополнения баланса */}
              {u.role === 'student' && (
                <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,background:'var(--gold-light)',color:'var(--gold)',cursor:'pointer',fontWeight:600}} onClick={function(){setBalanceEdit(u.id);setBalanceAmount(String(u.lessons_balance||0))}}>🎟 Баланс</span>
              )}
            </div>
          </div>

          {/* Редактирование имени */}
          {nameEdit === u.id && (
            <div style={{marginTop:10,padding:10,background:'var(--bg3)',borderRadius:10}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Редактировать имя:</div>
              <input type="text" value={nameValue} onChange={function(e){setNameValue(e.target.value)}} style={{width:'100%',padding:8,borderRadius:8,border:'1px solid var(--border)',fontSize:14,marginBottom:8,background:'var(--bg2)',color:'var(--text)'}} autoFocus />
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-primary" style={{flex:1,padding:8,fontSize:13}} onClick={function(){saveName(u.id)}}>Сохранить</button>
                <button className="btn btn-secondary" style={{flex:1,padding:8,fontSize:13}} onClick={function(){setNameEdit(null)}}>Отмена</button>
              </div>
            </div>
          )}

          {/* Смена роли */}
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

          {/* Привязка к Altegio педагог */}
          {editId === 'staff-'+u.id && (
            <div style={{marginTop:10,padding:10,background:'var(--bg3)',borderRadius:10}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Педагог в Altegio:</div>
              {staff.map(function(s) { return <button key={s.id} className="btn btn-secondary" style={{marginBottom:4,padding:8,fontSize:13,textAlign:'left'}} onClick={function(){linkStaff(u.id,s.id)}}>{s.name} — {s.specialization}</button> })}
              <button className="btn btn-secondary" style={{marginTop:4,padding:8,fontSize:12}} onClick={function(){changeRole(u.id,'teacher')}}>Без Altegio (Сцена 2)</button>
              <button className="btn btn-secondary" style={{padding:6,fontSize:11,color:'var(--text3)',marginTop:4}} onClick={function(){setEditId(null)}}>Отмена</button>
            </div>
          )}

          {/* Привязка к Altegio ученик */}
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

          {/* Пополнение баланса */}
          {u.role === 'student' && balanceEdit === u.id && (
            <div style={{marginTop:10,padding:10,background:'var(--bg3)',borderRadius:10}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Баланс уроков: {u.lessons_balance || 0}</div>

              {/* Быстрые пакеты */}
              {packages.length > 0 && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Добавить пакет:</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {packages.map(function(pkg) {
                      return <button key={pkg.id} className="btn btn-secondary" style={{padding:'6px 10px',fontSize:11}}
                        onClick={function(){addBalance(u.id, pkg.lessons_count, pkg.name)}}>
                        +{pkg.lessons_count} ({pkg.name})
                      </button>
                    })}
                  </div>
                </div>
              )}

              {/* Ручной ввод */}
              <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Или установить вручную:</div>
              <div style={{display:'flex',gap:6}}>
                <input type="number" value={balanceAmount} onChange={function(e){setBalanceAmount(e.target.value)}} placeholder="Кол-во уроков" style={{flex:1,padding:8,borderRadius:8,border:'1px solid var(--border)',fontSize:14,background:'var(--bg2)',color:'var(--text)'}} />
                <button className="btn btn-primary" style={{padding:'8px 14px',fontSize:12}} onClick={function(){setBalanceDirect(u.id)}}>Сохранить</button>
              </div>
              <button className="btn btn-secondary" style={{marginTop:6,padding:6,fontSize:11,color:'var(--text3)'}} onClick={function(){setBalanceEdit(null)}}>Отмена</button>
            </div>
          )}

          {/* Ставки педагога */}
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

        {/* НОВОЕ: Модалка редактирования статуса/источника */}
        {detailEdit && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}} onClick={function(){setDetailEdit(null)}}>
            <div style={{background:'var(--bg)',borderRadius:16,padding:20,width:'90%',maxWidth:400,maxHeight:'80vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>Подробности ученика</div>

              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Статус</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                {STATUSES.map(function(s) {
                  var isActive = detailEdit.student_status === s.id
                  return <button key={s.id} style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,border:'2px solid '+(isActive?s.color:'var(--border)'),background:isActive?s.color+'20':'var(--bg2)',color:isActive?s.color:'var(--text2)',cursor:'pointer'}} onClick={function(){setDetailEdit(Object.assign({},detailEdit,{student_status:s.id}))}}>{s.label}</button>
                })}
              </div>

              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Источник (откуда пришёл)</div>
              <select value={detailEdit.source} onChange={function(e){setDetailEdit(Object.assign({},detailEdit,{source:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,marginBottom:12,background:'var(--bg2)',color:'var(--text)'}}>
                <option value="">Не указан</option>
                {SOURCES.map(function(s) { return <option key={s.id} value={s.id}>{s.label}</option> })}
              </select>

              {detailEdit.student_status === 'trial' && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Дата пробного</div>
                  <input type="date" value={detailEdit.trial_date||''} onChange={function(e){setDetailEdit(Object.assign({},detailEdit,{trial_date:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,background:'var(--bg2)',color:'var(--text)'}} />
                </div>
              )}

              {detailEdit.student_status === 'frozen' && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Заморозка до</div>
                  <input type="date" value={detailEdit.frozen_until||''} onChange={function(e){setDetailEdit(Object.assign({},detailEdit,{frozen_until:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,background:'var(--bg2)',color:'var(--text)'}} />
                </div>
              )}

              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Заметки</div>
              <textarea value={detailEdit.notes} onChange={function(e){setDetailEdit(Object.assign({},detailEdit,{notes:e.target.value}))}} placeholder="Заметки об ученике..." rows={3} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,marginBottom:12,background:'var(--bg2)',color:'var(--text)',resize:'vertical'}} />

              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-primary" style={{flex:1,padding:10}} onClick={saveDetail}>Сохранить</button>
                <button className="btn btn-secondary" style={{flex:1,padding:10}} onClick={function(){setDetailEdit(null)}}>Отмена</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return <div className="page"><p>Загрузка...</p></div>
}

