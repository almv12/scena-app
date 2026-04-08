import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Approve() {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(function() { load() }, [])

  async function load() {
    try {
      var { data, error } = await supabase.from('conducted_lessons').select('*').order('created_at', { ascending: false }).limit(100)
      if (error) { setError(JSON.stringify(error)); setLoading(false); return }
      if (data) setLessons(data)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  async function approve(id) {
    await supabase.from('conducted_lessons').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  async function reject(id) {
    await supabase.from('conducted_lessons').update({ status: 'rejected' }).eq('id', id)
    load()
  }

  var pending = lessons.filter(function(l) { return l.status === 'pending' })
  var done = lessons.filter(function(l) { return l.status !== 'pending' })
  var attLabels = { present: 'Был', late: 'Опоздал', absent: 'Не пришёл', cancelled: 'Отменён' }

  if (error) return <div className="page"><div className="card" style={{color:'var(--red)',fontSize:13}}>Ошибка: {error}</div></div>

  return (
    <div className="page">
      <div className="section-title" style={{color:'var(--gold)'}}>На подтверждении ({pending.length})</div>
      {loading && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}
      {!loading && lessons.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Уроков пока нет. Педагоги ещё не отмечали уроки.</div>}
      {!loading && pending.length === 0 && lessons.length > 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Все уроки подтверждены</div>}
      {pending.map(function(l) {
        return (
          <div className="card" key={l.id}>
            <div className="lesson-name">{l.student_name}</div>
            <div className="lesson-sub">{l.lesson_date} · {l.lesson_time} · {l.instrument} · {l.lesson_type === 'group' ? 'Групп.' : 'Индив.'}</div>
            {l.attendance !== 'present' && <div style={{fontSize:12,color:'var(--red)',marginTop:4}}>{attLabels[l.attendance] || l.attendance}</div>}
            {l.note && <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>{l.note}</div>}
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button className="btn btn-primary" style={{flex:1,padding:10,fontSize:13}} onClick={function(){approve(l.id)}}>Подтвердить</button>
              <button className="btn btn-secondary" style={{flex:1,padding:10,fontSize:13,color:'var(--red)'}} onClick={function(){reject(l.id)}}>Отклонить</button>
            </div>
          </div>
        )
      })}
      {done.length > 0 && <div className="section-title">История ({done.length})</div>}
      {done.slice(0,20).map(function(l) {
        var st = l.status === 'approved' ? { bg: 'var(--green-light)', color: 'var(--green)', text: 'OK' } : { bg: 'var(--red-light)', color: 'var(--red)', text: 'Откл.' }
        return (
          <div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}><div className="lesson-name" style={{fontSize:13}}>{l.student_name}</div><div className="lesson-sub">{l.lesson_date} · {l.instrument}</div></div>
            <span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:st.bg,color:st.color,fontWeight:600}}>{st.text}</span>
          </div>
        )
      })}
    </div>
  )
}
