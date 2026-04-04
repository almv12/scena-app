import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function MarkLesson({ user, onBack }) {
  const [studentName, setStudentName] = useState('')
  const [instrument, setInstrument] = useState('Гитара')
  const [lessonType, setLessonType] = useState('individual')
  const [attendance, setAttendance] = useState('present')
  const [lateMin, setLateMin] = useState(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function save() {
    if (!studentName.trim()) return
    setSaving(true)
    var now = new Date()
    var date = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0')
    var time = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0')

    var { error } = await supabase.from('conducted_lessons').insert({
      teacher_id: user.id,
      student_name: studentName,
      instrument: instrument,
      lesson_type: lessonType,
      lesson_date: date,
      lesson_time: time,
      status: 'pending',
      attendance: attendance,
      late_minutes: attendance === 'late' ? lateMin : 0,
      note: note || null
    })

    if (error) {
      alert(JSON.stringify(error))
    } else {
      setDone(true)
    }
    setSaving(false)
  }

  if (done) {
    return (
      <div className="page" style={{textAlign:'center',paddingTop:60}}>
        <div style={{fontSize:48,marginBottom:16}}>✓</div>
        <h1 style={{fontSize:20,fontWeight:600}}>Урок отмечен!</h1>
        <p style={{color:'var(--text2)',marginTop:8}}>Ожидает подтверждения администратора</p>
        <button className="btn btn-primary" style={{marginTop:24}} onClick={onBack}>Назад</button>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="breadcrumb">
        <button onClick={onBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg></button>
        <span>Отметить урок</span>
      </div>

      <div className="card">
        <div style={{marginBottom:12}}>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Имя ученика</div>
          <input type="text" value={studentName} onChange={function(e){setStudentName(e.target.value)}} placeholder="Введите имя" style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #f0f0f0',fontSize:14}} />
        </div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Инструмент</div>
          <select value={instrument} onChange={function(e){setInstrument(e.target.value)}} style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #f0f0f0',fontSize:14,background:'white'}}>
            <option>Гитара</option>
            <option>Вокал</option>
            <option>Фортепиано</option>
            <option>Барабаны</option>
            <option>Скрипка</option>
            <option>Домбра</option>
            <option>Укулеле</option>
          </select>
        </div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Тип урока</div>
          <div style={{display:'flex',gap:8}}>
            <button className={'btn ' + (lessonType==='individual' ? 'btn-primary' : 'btn-secondary')} style={{flex:1,padding:10}} onClick={function(){setLessonType('individual')}}>Индивид.</button>
            <button className={'btn ' + (lessonType==='group' ? 'btn-primary' : 'btn-secondary')} style={{flex:1,padding:10}} onClick={function(){setLessonType('group')}}>Групповой</button>
          </div>
        </div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Посещаемость</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button className={'btn ' + (attendance==='present' ? 'btn-primary' : 'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setAttendance('present')}}>Был</button>
            <button className={'btn ' + (attendance==='late' ? 'btn-primary' : 'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setAttendance('late')}}>Опоздал</button>
            <button className={'btn ' + (attendance==='absent' ? 'btn-primary' : 'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setAttendance('absent')}}>Не пришёл</button>
          </div>
        </div>

        {attendance === 'late' && (
          <div style={{marginBottom:12}}>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Опоздание (минут)</div>
            <input type="number" value={lateMin} onChange={function(e){setLateMin(Number(e.target.value))}} style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #f0f0f0',fontSize:14}} />
          </div>
        )}

        <div style={{marginBottom:12}}>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Заметка (необязательно)</div>
          <textarea value={note} onChange={function(e){setNote(e.target.value)}} placeholder="Что прошли, домашнее задание..." rows={3} />
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Сохранение...' : 'Отметить урок'}</button>
    </div>
  )
}