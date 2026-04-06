import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin({ page }) {
  const [records, setRecords] = useState([])
  const [staff, setStaff] = useState([])
  const [checkins, setCheckins] = useState([])
  const [users, setUsers] = useState([])
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0,10))

  useEffect(function() { loadData() }, [page, dateFilter])

  async function loadData() {
    setLoading(true)
    if (page === 'home') {
      var r = await fetch('/api/altegio?action=records&date_from=' + dateFilter + '&date_to=' + dateFilter)
      var data = await r.json()
      if (data.ok) setRecords(data.records || [])
      var s = await fetch('/api/altegio?action=staff')
      var sd = await s.json()
      if (sd.ok) setStaff(sd.staff || [])
    }
    if (page === 'checkins') {
      var { data } = await supabase.from('checkins').select('*').order('check_in_at', { ascending: false }).limit(50)
      if (data) setCheckins(data)
    }
    if (page === 'users') {
      var { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (data) setUsers(data)
    }
    if (page === 'rates') {
      var { data } = await supabase.from('teacher_rates').select('*')
      if (data) setRates(data)
    }
    setLoading(false)
  }

  function getAttLabel(att) {
    if (att === 1) return { text: 'Был', bg: '#E1F5EE', color: '#1D9E75' }
    if (att === -1) return { text: 'Не пришёл', bg: '#FCEBEB', color: '#A32D2D' }
    return { text: 'Ожидает', bg: '#FAEEDA', color: '#854F0B' }
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
    var waiting = records.filter(function(r) { return r.attendance === 0 }).length

    return (
      <div className="page">
        <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
          <input type="date" value={dateFilter} onChange={function(e){setDateFilter(e.target.value)}} style={{flex:1,padding:10,borderRadius:10,border:'1px solid #f0f0f0',fontSize:14}} />
        </div>
        <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
          <div><div style={{fontSize:20,fontWeight:600}}>{records.length}</div><div style={{fontSize:11,color:'#888'}}>Всего</div></div>
          <div><div style={{fontSize:20,fontWeight:600,color:'#1D9E75'}}>{attended}</div><div style={{fontSize:11,color:'#888'}}>Были</div></div>
          <div><div style={{fontSize:20,fontWeight:600,color:'#A32D2D'}}>{missed}</div><div style={{fontSize:11,color:'#888'}}>Не пришли</div></div>
          <div><div style={{fontSize:20,fontWeight:600,color:'#854F0B'}}>{waiting}</div><div style={{fontSize:11,color:'#888'}}>Ожидают</div></div>
        </div>
        {loading && <div className="card" style={{color:'#888',fontSize:13}}>Загрузка...</div>}
        {staffNames.map(function(name) {
          var recs = byStaff[name]
          recs.sort(function(a,b) { return a.date > b.date ? 1 : -1 })
          return (
            <div key={name}>
              <div className="section-title">{name} ({recs.length} уроков)</div>
              {recs.map(function(rec) {
                var time = rec.date.slice(11,16)
                var client = rec.client ? rec.client.display_name : '—'
                var service = rec.services && rec.services[0] ? rec.services[0].title : ''
                var cost = rec.services && rec.services[0] ? rec.services[0].manual_cost : 0
                var badge = getAttLabel(rec.attendance)
                return (
                  <div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{minWidth:45,textAlign:'center'}}><div style={{fontSize:15,fontWeight:600}}>{time}</div><div style={{fontSize:10,color:'#888'}}>{Math.round(rec.length/60)}м</div></div>
                    <div style={{width:1,height:32,background:'#eee'}} />
                    <div style={{flex:1}}>
                      <div className="lesson-name" style={{fontSize:13}}>{client}</div>
                      <div className="lesson-sub">{service} · {cost > 0 ? cost.toLocaleString() + ' сум' : 'бесплатно'}</div>
                    </div>
                    <span style={{fontSize:10,padding:'3px 6px',borderRadius:6,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
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
        {checkins.length === 0 && <div className="card" style={{color:'#888',fontSize:13}}>Нет записей</div>}
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

  if (page === 'users') {
    return (
      <div className="page">
        <div className="section-title">Пользователи ({users.length})</div>
        {users.map(function(u) {
          return (
            <div className="card" key={u.id} style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="avatar" style={{background:'#E6F1FB',color:'#0C447C'}}>{u.full_name ? u.full_name[0] : '?'}</div>
              <div style={{flex:1}}>
                <div className="lesson-name">{u.full_name}</div>
                <div className="lesson-sub">{u.phone} · @{u.username || '-'}</div>
              </div>
              <span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:u.role==='teacher'?'#E1F5EE':u.role==='admin'?'#EEEDFE':'#E6F1FB',color:u.role==='teacher'?'#1D9E75':u.role==='admin'?'#534AB7':'#185FA5',fontWeight:600}}>{u.role}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (page === 'rates') {
    return (
      <div className="page">
        <div className="section-title">Ставки педагогов</div>
        {rates.length === 0 && <div className="card" style={{color:'#888',fontSize:13}}>Нет ставок</div>}
        {rates.map(function(r) {
          return (
            <div className="card" key={r.id}>
              <div className="lesson-sub">ID: {r.teacher_id.slice(0,8)}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}><span>Индив.</span><span style={{fontWeight:600}}>{r.individual_rate.toLocaleString()} сум</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span>Групп.</span><span style={{fontWeight:600}}>{r.group_rate.toLocaleString()} сум</span></div>
            </div>
          )
        })}
      </div>
    )
  }

  return <div className="page"><p>Загрузка...</p></div>
}
