import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Approve() {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(function() {
    console.log('Approve: loading data...')
    supabase.from('conducted_lessons').select('*').order('created_at', { ascending: false }).limit(100).then(function(res) {
      console.log('Approve result:', res)
      if (res.error) {
        setError(JSON.stringify(res.error))
      } else {
        setLessons(res.data || [])
      }
      setLoading(false)
    }).catch(function(e) {
      console.log('Approve catch:', e)
      setError(e.message)
      setLoading(false)
    })
  }, [])

  async function doApprove(id) {
    await supabase.from('conducted_lessons').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    window.location.reload()
  }

  async function doReject(id) {
    await supabase.from('conducted_lessons').update({ status: 'rejected' }).eq('id', id)
    window.location.reload()
  }

  var pending = lessons.filter(function(l) { return l.status === 'pending' })
  var done = lessons.filter(function(l) { return l.status !== 'pending' })

  
  if (error) return <div className="page"><div className="card" style={{color:'var(--red)',fontSize:13}}>Ошибка: {error}</div></div>
  if (loading) return <div className="page"><div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка данных...</div></div>

  return (
    <div className="page">
      <div className="section-title" style={{color:'var(--gold)'}}>На подтверждении ({pending.length})</div>
      {pending.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет уроков на проверке</div>}
      {pending.map(function(l) {
        return (
          <div className="card" key={l.id}>
            <div className="lesson-name">{l.student_name}</div>
            <div className="lesson-sub">{l.lesson_date} · {l.lesson_time} · {l.instrument} · {l.lesson_type === 'group' ? 'Групп.' : 'Индив.'}</div>
            {l.note && <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>{l.note}</div>}
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button className="btn btn-primary" style={{flex:1,padding:10}} onClick={function(){doApprove(l.id)}}>Подтвердить</button>
              <button className="btn btn-secondary" style={{flex:1,padding:10,color:'var(--red)'}} onClick={function(){doReject(l.id)}}>Отклонить</button>
            </div>
          </div>
        )
      })}
      {done.length > 0 && <div className="section-title">История ({done.length})</div>}
      {done.map(function(l) {
        var color = l.status === 'approved' ? 'var(--green)' : 'var(--red)'
        var text = l.status === 'approved' ? 'OK' : 'Откл.'
        return (
          <div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}><div className="lesson-name" style={{fontSize:13}}>{l.student_name}</div><div className="lesson-sub">{l.lesson_date} · {l.instrument}</div></div>
            <span style={{fontSize:11,fontWeight:600,color:color}}>{text}</span>
          </div>
        )
      })}
    </div>
  )
}
