import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Schedule() {
  const [altegioRecords, setAltegioRecords] = useState([])
  const [localItems, setLocalItems] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0,10))
  const [form, setForm] = useState({ teacher_id:'', student_name:'', instrument:'Гитара', lesson_date:'', lesson_time:'10:00', lesson_duration:60, lesson_type:'individual', branch_name:'Ганди 44' })

  var instruments = ['Гитара','Вокал','Барабаны','Фортепиано','Скрипка','Перкуссия','Укулеле']

  useEffect(function() { load() }, [dateFilter])

  async function load() {
    setLoading(true)

    try {
      var r = await fetch('/api/altegio?action=records&date_from=' + dateFilter + '&date_to=' + dateFilter)
      var d = await r.json()
      if (d.ok) setAltegioRecords(d.records || [])
    } catch(e) { setAltegioRecords([]) }

    // ФИКС: start_date вместо lesson_date
    var { data: local } = await supabase.from('schedule').select('*').eq('status', 'active').or('start_date.eq.' + dateFilter + ',and(repeat_weekly.eq.true,day_of_week.eq.' + new Date(dateFilter).getDay() + ')').order('lesson_time')
    if (local) setLocalItems(local)

    var { data: t } = await supabase.from('users').select('*').eq('role', 'teacher')
    if (t) setTeachers(t)

    var { data: st } = await supabase.from('users').select('*').eq('role', 'student')
    if (st) setStudents(st)

    setLoading(false)
  }

  async function saveLesson() {
    var teacher = teachers.find(function(t) { return t.id === form.teacher_id })
    var lessonDate = form.lesson_date || dateFilter
    // ФИКС: убрал lesson_date, оставил только start_date
    await supabase.from('schedule').insert({
      teacher_id: form.teacher_id,
      teacher_name: teacher ? teacher.full_name : '',
      student_name: form.student_name,
      instrument: form.instrument,
      day_of_week: new Date(lessonDate).getDay(),
      lesson_time: form.lesson_time,
      lesson_duration: Number(form.lesson_duration),
      lesson_type: form.lesson_type,
      repeat_weekly: false,
      branch_name: form.branch_name,
      start_date: lessonDate,
      status: 'active'
    })
    setShowForm(false)
    setForm({ teacher_id:'', student_name:'', instrument:'Гитара', lesson_date:'', lesson_time:'10:00', lesson_duration:60, lesson_type:'individual', branch_name:'Ганди 44' })
    load()
  }

  async function cancelLocal(id) {
    await supabase.from('schedule').update({ status: 'cancelled' }).eq('id', id)
    load()
  }

  function getAttLabel(att) {
    if (att === 1) return { text: 'Был', bg: 'var(--green-light)', color: 'var(--green)' }
    if (att === -1) return { text: 'Нет', bg: 'var(--red-light)', color: 'var(--red)' }
    return { text: 'Ждёт', bg: 'var(--gold-light)', color: 'var(--gold)' }
  }

  var byStaff = {}

  altegioRecords.forEach(function(rec) {
    var name = rec.staff ? rec.staff.name : '—'
    if (!byStaff[name]) byStaff[name] = { altegio: [], local: [] }
    byStaff[name].altegio.push(rec)
  })

  localItems.forEach(function(item) {
    var name = item.teacher_name || '—'
    if (!byStaff[name]) byStaff[name] = { altegio: [], local: [] }
    byStaff[name].local.push(item)
  })

  var staffNames = Object.keys(byStaff).sort()
  var totalAltegio = altegioRecords.length
  var totalLocal = localItems.length
  var attended = altegioRecords.filter(function(r) { return r.attendance === 1 }).length
  var missed = altegioRecords.filter(function(r) { return r.attendance === -1 }).length

  if (showForm) {
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setShowForm(false)}}>← Назад</button><span>Добавить урок</span></div>
        <div className="card">
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Педагог</div>
          <select value={form.teacher_id} onChange={function(e){setForm(Object.assign({},form,{teacher_id:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,marginBottom:10,background:'var(--bg2)',color:'var(--text)'}}>
            <option value="">Выберите...</option>
            {teachers.map(function(t) { return <option key={t.id} value={t.id}>{t.full_name}</option> })}
          </select>

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Ученик</div>
          <input type="text" value={form.student_name} onChange={function(e){setForm(Object.assign({},form,{student_name:e.target.value}))}} placeholder="Имя ученика" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,marginBottom:10}} />

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Инструмент</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
            {instruments.map(function(inst) {
              return <button key={inst} className={'btn '+(form.instrument===inst?'btn-primary':'btn-secondary')} style={{flex:'0 0 auto',padding:'6px 12px',fontSize:12,width:'auto'}} onClick={function(){setForm(Object.assign({},form,{instrument:inst}))}}>{inst}</button>
            })}
          </div>

          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Дата</div>
              <input type="date" value={form.lesson_date||dateFilter} onChange={function(e){setForm(Object.assign({},form,{lesson_date:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,background:'var(--bg2)',color:'var(--text)'}} />
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
                <option value="30">30 мин</option><option value="45">45 мин</option><option value="60">60 мин</option><option value="90">90 мин</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Тип</div>
              <select value={form.lesson_type} onChange={function(e){setForm(Object.assign({},form,{lesson_type:e.target.value}))}} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border)',fontSize:14,background:'var(--bg2)',color:'var(--text)'}}>
                <option value="individual">Индивидуальный</option><option value="group">Групповой</option>
              </select>
            </div>
          </div>

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Филиал</div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <button className={'btn '+(form.branch_name==='Ганди 44'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setForm(Object.assign({},form,{branch_name:'Ганди 44'}))}}>Ганди 44</button>
            <button className={'btn '+(form.branch_name==='Ганди 29'?'btn-primary':'btn-secondary')} style={{flex:1,padding:8,fontSize:13}} onClick={function(){setForm(Object.assign({},form,{branch_name:'Ганди 29'}))}}>Ганди 29</button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveLesson} disabled={!form.teacher_id||!form.student_name}>Сохранить</button>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div className="greeting" style={{padding:0}}><h1>Расписание</h1></div>
        <button className="btn btn-primary" style={{width:'auto',padding:'8px 14px',fontSize:13}} onClick={function(){setShowForm(true)}}>+ Урок</button>
      </div>

      <input type="date" value={dateFilter} onChange={function(e){setDateFilter(e.target.value)}} style={{width:'100%',padding:10,borderRadius:12,border:'1px solid var(--border)',fontSize:14,marginBottom:8,background:'var(--bg2)',color:'var(--text)',fontFamily:'inherit'}} />

      <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
        <div><div style={{fontSize:18,fontWeight:700}}>{totalAltegio + totalLocal}</div><div style={{fontSize:10,color:'var(--text2)'}}>Всего</div></div>
        <div><div style={{fontSize:18,fontWeight:700,color:'var(--blue)'}}>{totalAltegio}</div><div style={{fontSize:10,color:'var(--text2)'}}>Altegio</div></div>
        <div><div style={{fontSize:18,fontWeight:700,color:'var(--gold)'}}>{totalLocal}</div><div style={{fontSize:10,color:'var(--text2)'}}>Добавлены</div></div>
        <div><div style={{fontSize:18,fontWeight:700,color:'var(--green)'}}>{attended}</div><div style={{fontSize:10,color:'var(--text2)'}}>Были</div></div>
        <div><div style={{fontSize:18,fontWeight:700,color:'var(--red)'}}>{missed}</div><div style={{fontSize:10,color:'var(--text2)'}}>Нет</div></div>
      </div>

      {loading && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}

      {staffNames.map(function(name) {
        var data = byStaff[name]
        var total = data.altegio.length + data.local.length
        return (
          <div key={name}>
            <div className="section-title">{name} ({total})</div>

            {data.altegio.sort(function(a,b){return a.date>b.date?1:-1}).map(function(rec) {
              var time = rec.date.slice(11,16)
              var client = rec.client ? rec.client.display_name : '—'
              var service = rec.services && rec.services[0] ? rec.services[0].title : ''
              var badge = getAttLabel(rec.attendance)
              return (
                <div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{minWidth:45,textAlign:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--gold)'}}>{time}</div></div>
                  <div style={{width:1,height:30,background:'var(--border)'}} />
                  <div style={{flex:1}}><div className="lesson-name" style={{fontSize:13}}>{client}</div><div className="lesson-sub">{service} <span style={{fontSize:9,color:'var(--blue)'}}>Altegio</span></div></div>
                  <span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
                </div>
              )
            })}

            {data.local.sort(function(a,b){return a.lesson_time>b.lesson_time?1:-1}).map(function(item) {
              return (
                <div className="card" key={item.id} style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{minWidth:45,textAlign:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--gold)'}}>{item.lesson_time}</div><div style={{fontSize:9,color:'var(--text3)'}}>{item.lesson_duration}м</div></div>
                  <div style={{width:1,height:30,background:'var(--border)'}} />
                  <div style={{flex:1}}><div className="lesson-name" style={{fontSize:13}}>{item.student_name}</div><div className="lesson-sub">{item.instrument} · {item.branch_name} <span style={{fontSize:9,color:'var(--gold)'}}>Добавлен</span></div></div>
                  <button style={{background:'none',border:'none',fontSize:14,color:'var(--red)',cursor:'pointer',padding:6}} onClick={function(){cancelLocal(item.id)}}>✕</button>
                </div>
              )
            })}
          </div>
        )
      })}

      {!loading && staffNames.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Нет уроков на эту дату</div>}
    </div>
  )
}

