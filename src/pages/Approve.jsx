import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Approve() {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(function() { loadData() }, [])

  async function loadData() {
    setLoading(true)
    var res = await supabase.from('conducted_lessons').select('*').order('created_at', { ascending: false }).limit(100)
    if (res.error) {
      setError(JSON.stringify(res.error))
    } else {
      setLessons(res.data || [])
    }
    setLoading(false)
  }

  async function doApprove(id) {
    var lesson = lessons.find(function(l) { return l.id === id })
    if (!lesson) return

    // 1. Подтверждаем урок
    await supabase.from('conducted_lessons').update({
      status: 'approved',
      approved_at: new Date().toISOString()
    }).eq('id', id)

    // 2. Списываем 1 урок с баланса ученика (ищем по имени)
    if (lesson.student_name) {
      var { data: students } = await supabase.from('users')
        .select('id, lessons_balance, telegram_id, full_name')
        .eq('role', 'student')
        .eq('full_name', lesson.student_name)
        .limit(1)

      if (students && students.length > 0) {
        var student = students[0]
        var newBalance = Math.max(0, (student.lessons_balance || 0) - 1)

        await supabase.from('users').update({
          lessons_balance: newBalance
        }).eq('id', student.id)

        // 3. Уведомление если остаток ≤ 2
        if (newBalance <= 2 && newBalance >= 0 && student.telegram_id) {
          var msg = newBalance === 0
            ? '⚠️ Ваш баланс уроков: 0. Пожалуйста, продлите абонемент!'
            : '📋 Осталось ' + newBalance + ' урок(а). Продлите абонемент, чтобы не прерывать занятия!'
          try {
            await fetch('/api/webhook?action=notify&chat_id=' + student.telegram_id + '&text=' + encodeURIComponent(msg))
          } catch(e) {}
        }
      }
    }

    loadData()
  }

  async function doReject(id) {
    await supabase.from('conducted_lessons').update({ status: 'rejected' }).eq('id', id)
    loadData()
  }

  var pending = lessons.filter(function(l) { return l.status === 'pending' })
  var done = lessons.filter(function(l) { return l.status !== 'pending' })

  if (error) return <div className="page"><div className="card" style={{color:'var(--red)',fontSize:13}}>Ошибка: {error}</div></div>
  if (loading) return <div className="page"><div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка данных...</div></div>

  return (
    <div className="page">
      <div className="section-title" style={{color:'var(--gold)'}}>На подтверждении ({pending.length})</div>
      {pending.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет уроков на проверке ✓</div>}
      {pending.map(function(l) {
        return (
          <div className="card" key={l.id}>
            <div className="lesson-name">{l.student_name}</div>
            <div className="lesson-sub">{l.lesson_date} · {l.lesson_time} · {l.instrument} · {l.lesson_type === 'group' ? 'Групп.' : 'Индив.'}</div>
            {l.attendance && (
              <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,fontWeight:600,marginTop:4,display:'inline-block',
                background: l.attendance==='present'?'var(--green-light)':l.attendance==='late'?'var(--gold-light)':'var(--red-light)',
                color: l.attendance==='present'?'var(--green)':l.attendance==='late'?'var(--gold)':'var(--red)'
              }}>{l.attendance==='present'?'Был':l.attendance==='late'?'Опоздал':'Не был'}</span>
            )}
            {l.note && <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>💬 {l.note}</div>}
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button className="btn btn-primary" style={{flex:1,padding:10}} onClick={function(){doApprove(l.id)}}>✓ Подтвердить</button>
              <button className="btn btn-secondary" style={{flex:1,padding:10,color:'var(--red)'}} onClick={function(){doReject(l.id)}}>✕ Отклонить</button>
            </div>
          </div>
        )
      })}

      {done.length > 0 && <div className="section-title">История ({done.length})</div>}
      {done.map(function(l) {
        var color = l.status === 'approved' ? 'var(--green)' : 'var(--red)'
        var text = l.status === 'approved' ? '✓ Подтверждён' : '✕ Отклонён'
        return (
          <div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}>
              <div className="lesson-name" style={{fontSize:13}}>{l.student_name}</div>
              <div className="lesson-sub">{l.lesson_date} · {l.lesson_time} · {l.instrument}</div>
            </div>
            <span style={{fontSize:11,fontWeight:600,color:color}}>{text}</span>
          </div>
        )
      })}
    </div>
  )
}

