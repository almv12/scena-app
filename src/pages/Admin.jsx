import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin({ page }) {
  const [lessons, setLessons] = useState([])
  const [checkins, setCheckins] = useState([])
  const [users, setUsers] = useState([])
  const [rates, setRates] = useState([])

  useEffect(function() { loadData() }, [page])

  async function loadData() {
    if (page === 'home') {
      var { data } = await supabase.from('conducted_lessons').select('*').order('created_at', { ascending: false }).limit(50)
      if (data) setLessons(data)
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
  }

  async function approveLesson(id) {
    await supabase.from('conducted_lessons').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    loadData()
  }

  async function rejectLesson(id) {
    await supabase.from('conducted_lessons').update({ status: 'rejected' }).eq('id', id)
    loadData()
  }

  var statusColors = { pending: '#FAEEDA', approved: '#E1F5EE', rejected: '#FCEBEB' }
  var statusText = { pending: '#854F0B', approved: '#1D9E75', rejected: '#A32D2D' }
  var statusLabels = { pending: 'Ожидает', approved: 'Подтверждён', rejected: 'Отклонён' }
  var attLabels = { present: 'Был', late: 'Опоздал', absent: 'Не пришёл', cancelled: 'Отменён' }

  if (page === 'home') {
    var pending = lessons.filter(function(l) { return l.status === 'pending' })
    var rest = lessons.filter(function(l) { return l.status !== 'pending' })
    return (
      <div className="page">
        <div className="section-title">На подтверждении ({pending.length})</div>
        {pending.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет уроков на подтверждении</div>}
        {pending.map(function(l) {
          return (
            <div className="card" key={l.id}>
              <div style={{display:'flex',justifyContent:'space-between'}}><div className="lesson-name">{l.student_name}</div><span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:statusColors.pending,color:statusText.pending,fontWeight:600}}>Ожидает</span></div>
              <div className="lesson-sub">{l.lesson_date} · {l.lesson_time} · {l.instrument} · {l.lesson_type === 'group' ? 'Групп.' : 'Индив.'}</div>
              {l.attendance !== 'present' && <div style={{fontSize:12,color:'#A32D2D',marginTop:4}}>{attLabels[l.attendance]}{l.late_minutes > 0 ? ' ' + l.late_minutes + ' мин' : ''}</div>}
              {l.note && <div style={{fontSize:12,color:'var(--text2)',marginTop:4}}>{l.note}</div>}
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <button className="btn btn-primary" style={{flex:1,padding:10}} onClick={function(){approveLesson(l.id)}}>Подтвердить</button>
                <button className="btn btn-secondary" style={{flex:1,padding:10,color:'#A32D2D'}} onClick={function(){rejectLesson(l.id)}}>Отклонить</button>
              </div>
            </div>
          )
        })}
        <div className="section-title" style={{marginTop:12}}>История ({rest.length})</div>
        {rest.map(function(l) {
          return (
            <div className="card" key={l.id}>
              <div style={{display:'flex',justifyContent:'space-between'}}><div className="lesson-name">{l.student_name}</div><span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:statusColors[l.status],color:statusText[l.status],fontWeight:600}}>{statusLabels[l.status]}</span></div>
              <div className="lesson-sub">{l.lesson_date} · {l.instrument} · {l.lesson_type === 'group' ? 'Групп.' : 'Индив.'}</div>
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
              <div className="lesson-sub">{d.toLocaleDateString('ru')} · {d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})} — {c.check_out_at ? new Date(c.check_out_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}) : 'на смене'}</div>
              <div className="lesson-sub">ID: {c.teacher_id.slice(0,8)}</div>
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
        {rates.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Ставки не заданы</div>}
        {rates.map(function(r) {
          return (
            <div className="card" key={r.id}>
              <div className="lesson-sub">ID: {r.teacher_id.slice(0,8)}</div>
              <div className="salary-row"><span className="salary-label">Индивидуальный</span><span className="salary-value">{r.individual_rate.toLocaleString()} сум</span></div>
              <div className="salary-row"><span className="salary-label">Групповой</span><span className="salary-value">{r.group_rate.toLocaleString()} сум</span></div>
            </div>
          )
        })}
      </div>
    )
  }

  return <div className="page"><p>Загрузка...</p></div>
}
