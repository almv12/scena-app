import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Schedule() {
  const [items, setItems] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [dayFilter, setDayFilter] = useState(new Date().getDay())
  const [form, setForm] = useState({ teacher_id:'', student_name:'', instrument:'Гитара', day_of_week:1, lesson_time:'10:00', lesson_duration:60, lesson_type:'individual', repeat_weekly:true, branch_name:'Ганди 44' })

  var days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
  var instruments = ['Гитара','Вокал','Барабаны','Фортепиано','Скрипка','Перкуссия','Укулеле']
  var branches = ['Ганди 44','Ганди 29']

  useEffect(function() { load() }, [])

  async function load() {
    var { data: s } = await supabase.from('schedule').select('*').eq('status', 'active').order('lesson_time')
    if (s) setItems(s)
    var { data: t } = await supabase.from('users').select('*').eq('role', 'teacher')
    if (t) setTeachers(t)
    var { data: st } = await supabase.from('users').select('*').eq('role', 'student')
    if (st) setStudents(st)
    setLoading(false)
  }

  async function saveLesson() {
    var teacher = teachers.find(function(t) { return t.id === form.teacher_id })
    var { error } = await supabase.from('schedule').insert({
      teacher_id: form.teacher_id,
      teacher_name: teacher ? teacher.full_name : '',
      student_name: form.student_name,
      instrument: form.instrument,
      day_of_week: Number(form.day_of_week),
      lesson_time: form.lesson_time,
      lesson_duration: Number(form.lesson_duration),
      lesson_type: form.lesson_type,
      repeat_weekly: form.repeat_weekly,
      branch_name: form.branch_name,
      start_date: new Date().toISOString().slice(0,10)
    })
    if (!error) {
      setShowForm(false)
      setForm({ teacher_id:'', student_name:'', instrument:'Гитара', day_of_week:1, lesson_time:'10:00', lesson_duration:60, lesson_type:'individual', repeat_weekly:true, branch_name:'Ганди 44' })
      load()
    }
  }

  async function cancelLesson(id) {
    await supabase.from('schedule').update({ status: 'cancelled' }).eq('id', id)
    load()
  }

  var filtered = items.filter(function(i) { return i.day_of_week === dayFilter })
  filtered.sort(function(a,b) { return a.lesson_time > b.lesson_time ? 1 : -1 })

  var byTeacher = {}
  filtered.forEach(function(i) {
    var name = i.teacher_name || '—'
    if (!byTeacher[name]) byTeacher[name] = []
    byTeacher[name].push(i)
  })

  if (showForm) {
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setShowForm(false)}}>← Назад</button><span>Новый урок</span></div>

        <div className="card">
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Педагог</div>
          <select value={form.teacher_id} onChange={function(e){setForm(Object.assign({},form,{teacher_id:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,marginBottom:10,background:'var(--bg2)',color:'var(--text)'}}>
            <option value="">Выберите...</option>
            {teachers.map(function(t) { return <option key={t.id} value={t.id}>{t.full_name}</option> })}
          </select>

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Ученик</div>
          <select value={form.student_name} onChange={function(e){setForm(Object.assign({},form,{student_name:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,marginBottom:10,background:'var(--bg2)',color:'var(--text)'}}>
            <option value="">Выберите или введите...</option>
            {students.map(function(s) { return <option key={s.id} value={s.full_name}>{s.full_name}</option> })}
          </select>
          <input type="text" value={form.student_name} onChange={function(e){setForm(Object.assign({},form,{student_name:e.target.value}))}} placeholder="Или введите имя вручную" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,marginBottom:10}} />

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Инструмент</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
            {instruments.map(function(inst) {
              return <button key={inst} className={'btn ' + (form.instrument===inst?'btn-primary':'btn-secondary')} style={{flex:'0 0 auto',padding:'6px 12px',fontSize:12,width:'auto'}} onClick={function(){setForm(Object.assign({},form,{instrument:inst}))}}>{inst}</button>
            })}
          </div>

          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>День</div>
              <select value={form.day_of_week} onChange={function(e){setForm(Object.assign({},form,{day_of_week:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,background:'var(--bg2)',color:'var(--text)'}}>
                {days.map(function(d,i) { return <option key={i} value={i}>{d}</option> })}
              </select>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Время</div>
              <input type="time" value={form.lesson_time} onChange={function(e){setForm(Object.assign({},form,{lesson_time:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,background:'var(--bg2)',color:'var(--text)'}} />
            </div>
          </div>

          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Длительность</div>
              <select value={form.lesson_duration} onChange={function(e){setForm(Object.assign({},form,{lesson_duration:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,background:'var(--bg2)',color:'var(--text)'}}>
                <option value="30">30 мин</option>
                <option value="45">45 мин</option>
                <option value="60">60 мин</option>
                <option value="90">90 мин</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Тип</div>
              <select value={form.lesson_type} onChange={function(e){setForm(Object.assign({},form,{lesson_type:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,background:'var(--bg2)',color:'var(--text)'}}>
                <option value="individual">Индивидуальный</option>
                <option value="group">Групповой</option>
              </select>
            </div>
          </div>

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Филиал</div>
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            {branches.map(function(b) {
              return <button key={b} className={'btn ' + (form.branch_name===b?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setForm(Object.assign({},form,{branch_name:b}))}}>{b}</button>
            })}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <input type="checkbox" checked={form.repeat_weekly} onChange={function(e){setForm(Object.assign({},form,{repeat_weekly:e.target.checked}))}} />
            <span style={{fontSize:13}}>Повторять каждую неделю</span>
          </div>
        </div>

        <button className="btn btn-primary" onClick={saveLesson} disabled={!form.teacher_id || !form.student_name}>Сохранить урок</button>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div className="greeting" style={{padding:0}}><h1>Расписание</h1><p>{filtered.length} уроков</p></div>
        <button className="btn btn-primary" style={{width:'auto',padding:'10px 16px',fontSize:13}} onClick={function(){setShowForm(true)}}>+ Урок</button>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:12,overflowX:'auto'}}>
        {days.map(function(d,i) {
          var count = items.filter(function(it){return it.day_of_week===i}).length
          return <button key={i} className={'btn ' + (dayFilter===i?'btn-primary':'btn-secondary')} style={{flex:1,padding:'8px 2px',fontSize:12,minWidth:40}} onClick={function(){setDayFilter(i)}}>{d}<br/><span style={{fontSize:10,opacity:0.7}}>{count}</span></button>
        })}
      </div>

      {loading && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}

      {Object.keys(byTeacher).sort().map(function(name) {
        var lessons = byTeacher[name]
        return (
          <div key={name}>
            <div className="section-title">{name} ({lessons.length})</div>
            {lessons.map(function(l) {
              return (
                <div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{minWidth:50,textAlign:'center'}}>
                    <div style={{fontSize:15,fontWeight:700,color:'var(--gold)'}}>{l.lesson_time}</div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>{l.lesson_duration}м</div>
                  </div>
                  <div style={{width:1,height:36,background:'var(--border)'}} />
                  <div style={{flex:1}}>
                    <div className="lesson-name">{l.student_name}</div>
                    <div className="lesson-sub">{l.instrument} · {l.lesson_type==='group'?'Групп.':'Индив.'} · {l.branch_name}</div>
                  </div>
                  <button style={{background:'none',border:'none',fontSize:16,color:'var(--red)',cursor:'pointer',padding:8}} onClick={function(){cancelLesson(l.id)}}>✕</button>
                </div>
              )
            })}
          </div>
        )
      })}

      {!loading && filtered.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Нет уроков на {days[dayFilter]}</div>}
    </div>
  )
}
