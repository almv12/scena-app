import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin({ page }) {
  const [lessons, setLessons] = useState([])
  const [checkins, setCheckins] = useState([])
  const [users, setUsers] = useState([])
  const [rates, setRates] = useState([])

  useEffect(function() { loadData() }, [page])

  async function loadData() {
    var res
    if (page === 'home') {
      res = await supabase.from('conducted_lessons').select('*').order('created_at', { ascending: false }).limit(50)
      if (res.data) setLessons(res.data)
    }
    if (page === 'checkins') {
      res = await supabase.from('checkins').select('*').order('check_in_at', { ascending: false }).limit(50)
      if (res.data) setCheckins(res.data)
    }
    if (page === 'users') {
      res = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (res.data) setUsers(res.data)
    }
    if (page === 'rates') {
      res = await supabase.from('teacher_rates').select('*')
      if (res.data) setRates(res.data)
    }
  }

  async function approve(id) {
    await supabase.from('conducted_lessons').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    loadData()
  }

  async function reject(id) {
    await supabase.from('conducted_lessons').update({ status: 'rejected' }).eq('id', id)
    loadData()
  }

  
  if (page === 'home') {
    var pending = lessons.filter(function(l) { return l.status === 'pending' })
    var done = lessons.filter(function(l) { return l.status !== 'pending' })
    return (
      <div className="page">
        <div className="section-title">На подтверждении ({pending.length})</div>
        {pending.length === 0 && <div className="card" style={{color:'#888',fontSize:13}}>Нет уроков</div>}
        {pending.map(function(l) {
          return (
            <div className="card" key={l.id}>
              <div className="lesson-name">{l.student_name}</div>
              <div className="lesson-sub">{l.lesson_date} · {l.instrument} · {l.lesson_type === 'group' ? 'Групп.' : 'Индив.'}</div>
              {l.note && <div style={{fontSize:12,color:'#888',marginTop:4}}>{l.note}</div>}
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <button className="btn btn-primary" style={{flex:1,padding:10}} onClick={function(){approve(l.id)}}>Подтвердить</button>
                <button className="btn btn-secondary" style={{flex:1,padding:10}} onClick={function(){reject(l.id)}}>Отклонить</button>
              </div>
            </div>
          )
        })}
        <div className="section-title">История ({done.length})</div>
        {done.map(function(l) {
          return (
            <div className="card" key={l.id}>
              <div style={{display:'flex',justifyContent:'space-between'}}><div className="lesson-name">{l.student_name}</div><span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:l.status==='approved'?'#E1F5EE':'#FCEBEB',color:l.status==='approved'?'#1D9E75':'#A32D2D',fontWeight:600}}>{l.status==='approved'?'OK':'Нет'}</span></div>
              <div className="lesson-sub">{l.lesson_date} · {l.instrument}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (page === 'checkins') {
    return (
      <div className="page">
        <div className="section-title">Check-in</div>
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
                <div className="lesson-sub">{u.phone} · {u.role}</div>
              </div>

            </div>
          )
        })}
      </div>
    )
  }

  if (page === 'rates') {
    return (
      <div className="page">
        <div className="section-title">Ставки</div>
        {rates.length === 0 && <div className="card" style={{color:'#888',fontSize:13}}>Нет ставок</div>}
        {rates.map(function(r) {
          return (
            <div className="card" key={r.id}>
              <div className="lesson-sub">ID: {r.teacher_id.slice(0,8)}</div>
              <div className="salary-row"><span className="salary-label">Индив.</span><span className="salary-value">{r.individual_rate} сум</span></div>
              <div className="salary-row"><span className="salary-label">Групп.</span><span className="salary-value">{r.group_rate} сум</span></div>
            </div>
          )
        })}
      </div>
    )
  }

  return <div className="page"><p>Загрузка...</p></div>
}
