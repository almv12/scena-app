import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RateLesson({ user, lesson, onClose }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function save() {
    if (rating === 0) return
    setSaving(true)
    await supabase.from('lesson_ratings').insert({
      student_id: user.id,
      teacher_name: lesson.teacher || '',
      instrument: lesson.service || '',
      rating: rating,
      comment: comment,
      lesson_date: lesson.date || new Date().toISOString().slice(0,10)
    })
    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="page" style={{textAlign:'center',paddingTop:40}}>
        <div style={{fontSize:48,marginBottom:12}}>⭐</div>
        <div style={{fontSize:18,fontWeight:700,color:'var(--gold)',marginBottom:8}}>Спасибо за оценку!</div>
        <div style={{fontSize:14,color:'var(--text2)',marginBottom:20}}>Ваш отзыв помогает нам стать лучше</div>
        <button className="btn btn-primary" style={{maxWidth:200,margin:'0 auto'}} onClick={onClose}>Готово</button>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="breadcrumb">
        <button onClick={onClose}>← Назад</button>
        <span>Оценить урок</span>
      </div>
      <div className="card" style={{textAlign:'center'}}>
        <div style={{fontSize:14,color:'var(--text2)',marginBottom:4}}>{lesson.service || 'Урок'}</div>
        <div className="lesson-name" style={{marginBottom:4}}>{lesson.teacher || ''}</div>
        <div style={{fontSize:12,color:'var(--text3)'}}>{lesson.date || ''}</div>
      </div>
      <div className="card" style={{textAlign:'center'}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Как прошёл урок?</div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:16}}>
          {[1,2,3,4,5].map(function(n) {
            return <button key={n} onClick={function(){setRating(n)}} style={{fontSize:32,background:'none',border:'none',cursor:'pointer',opacity:n<=rating?1:0.25,transition:'opacity 0.2s'}}>{n<=rating?'⭐':'☆'}</button>
          })}
        </div>
        <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>
          {rating===1?'Плохо':rating===2?'Так себе':rating===3?'Нормально':rating===4?'Хорошо':rating===5?'Отлично':'Нажмите на звезду'}
        </div>
      </div>
      <div className="card">
        <div style={{fontSize:13,color:'var(--text2)',marginBottom:6}}>Комментарий (необязательно)</div>
        <textarea value={comment} onChange={function(e){setComment(e.target.value)}} placeholder="Что понравилось? Что улучшить?" rows={3} />
      </div>
      <button className="btn btn-primary" onClick={save} disabled={rating===0||saving} style={{marginTop:8}}>{saving?'Сохранение...':'Отправить оценку'}</button>
    </div>
  )
}
