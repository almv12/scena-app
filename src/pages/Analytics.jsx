import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Analytics() {
  const [teachers, setTeachers] = useState([])
  const [lessons, setLessons] = useState([])
  const [checkins, setCheckins] = useState([])
  const [ratings, setRatings] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  var now = new Date()
  var month = now.getMonth() + 1
  var year = now.getFullYear()
  var monthNames = ['','Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
  var start = year + '-' + String(month).padStart(2,'0') + '-01'
  var end = year + '-' + String(month).padStart(2,'0') + '-31'

  useEffect(function() { load() }, [])

  async function load() {
    var { data: t } = await supabase.from('users').select('*').eq('role', 'teacher')
    if (t) setTeachers(t)

    var { data: l } = await supabase.from('conducted_lessons').select('*').gte('lesson_date', start).lte('lesson_date', end)
    if (l) setLessons(l)

    var { data: c } = await supabase.from('checkins').select('*').gte('check_in_at', start)
    if (c) setCheckins(c)

    var { data: r } = await supabase.from('lesson_ratings').select('*').gte('created_at', start)
    if (r) setRatings(r)

    try {
      var ar = await fetch('/api/altegio?action=records&date_from=' + start + '&date_to=' + end)
      var ad = await ar.json()
      if (ad.ok) setRecords(ad.records || [])
    } catch(e) {}

    setLoading(false)
  }

  function getTeacherData(t) {
    var myLessons = lessons.filter(function(l) { return l.teacher_id === t.id })
    var approved = myLessons.filter(function(l) { return l.status === 'approved' })
    var pending = myLessons.filter(function(l) { return l.status === 'pending' })
    var rejected = myLessons.filter(function(l) { return l.status === 'rejected' })

    var present = myLessons.filter(function(l) { return l.attendance === 'present' }).length
    var late = myLessons.filter(function(l) { return l.attendance === 'late' }).length
    var absent = myLessons.filter(function(l) { return l.attendance === 'absent' }).length
    var cancelled = myLessons.filter(function(l) { return l.attendance === 'cancelled' }).length

    var totalLateMin = 0
    myLessons.forEach(function(l) { if (l.late_minutes) totalLateMin += l.late_minutes })

    var myCheckins = checkins.filter(function(c) { return c.teacher_id === t.id })
    var totalHours = 0
    myCheckins.forEach(function(c) { if (c.total_minutes) totalHours += c.total_minutes })
    totalHours = Math.round(totalHours / 60 * 10) / 10

    var myRatings = ratings.filter(function(r) { return r.teacher_name && t.full_name && r.teacher_name.toLowerCase().indexOf(t.full_name.split(' ')[0].toLowerCase()) >= 0 })
    var avgRating = myRatings.length > 0 ? (myRatings.reduce(function(s,r){return s+r.rating},0) / myRatings.length).toFixed(1) : '—'

    var myRecords = t.altegio_staff_id ? records.filter(function(r) { return r.staff_id === t.altegio_staff_id }) : []
    var uniqueStudents = {}
    myRecords.forEach(function(r) { if (r.client) uniqueStudents[r.client.display_name] = true })
    var studentCount = Object.keys(uniqueStudents).length

    var prevStart = year + '-' + String(month > 1 ? month - 1 : 12).padStart(2,'0') + '-01'

    return {
      name: t.full_name || '—',
      staffId: t.altegio_staff_id,
      totalLessons: myLessons.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      present: present,
      late: late,
      absent: absent,
      cancelled: cancelled,
      totalLateMin: totalLateMin,
      avgLateMin: late > 0 ? Math.round(totalLateMin / late) : 0,
      checkinCount: myCheckins.length,
      totalHours: totalHours,
      avgRating: avgRating,
      ratingCount: myRatings.length,
      studentCount: studentCount,
      altegioLessons: myRecords.length
    }
  }

  function stars(n) { var s = ''; for (var i = 0; i < 5; i++) s += i < Math.round(n) ? '⭐' : '☆'; return s }

  if (loading) return <div className="page"><div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка аналитики...</div></div>

  if (selected) {
    var d = getTeacherData(selected)
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setSelected(null)}}>← Назад</button><span>{d.name}</span></div>

        <div className="card" style={{textAlign:'center'}}>
          <div className="avatar" style={{width:56,height:56,fontSize:22,margin:'0 auto 8px'}}>{d.name[0]}</div>
          <div style={{fontSize:18,fontWeight:700}}>{d.name}</div>
          <div style={{fontSize:13,color:'var(--text2)'}}>{d.staffId ? 'Altegio: ' + d.staffId : 'Без Altegio'}</div>
          <div style={{fontSize:14,marginTop:4}}>{stars(d.avgRating)} {d.avgRating} ({d.ratingCount} отзывов)</div>
        </div>

        <div className="section-title">Уроки за {monthNames[month]}</div>
        <div className="card">
          <div className="salary-row"><span className="salary-label">Всего отмечено</span><span className="salary-value">{d.totalLessons}</span></div>
          <div className="salary-row"><span className="salary-label">Подтверждено</span><span className="salary-value" style={{color:'var(--green)'}}>{d.approved}</span></div>
          <div className="salary-row"><span className="salary-label">На проверке</span><span className="salary-value" style={{color:'var(--gold)'}}>{d.pending}</span></div>
          <div className="salary-row"><span className="salary-label">Отклонено</span><span className="salary-value" style={{color:'var(--red)'}}>{d.rejected}</span></div>
          {d.altegioLessons > 0 && <div className="salary-row"><span className="salary-label">В Altegio</span><span className="salary-value">{d.altegioLessons}</span></div>}
        </div>

        <div className="section-title">Посещаемость учеников</div>
        <div className="card">
          <div className="salary-row"><span className="salary-label">Были</span><span className="salary-value" style={{color:'var(--green)'}}>{d.present}</span></div>
          <div className="salary-row"><span className="salary-label">Опоздали</span><span className="salary-value" style={{color:'var(--gold)'}}>{d.late}</span></div>
          <div className="salary-row"><span className="salary-label">Не пришли</span><span className="salary-value" style={{color:'var(--red)'}}>{d.absent}</span></div>
          <div className="salary-row"><span className="salary-label">Отменено</span><span className="salary-value">{d.cancelled}</span></div>
          {d.late > 0 && <div className="salary-row"><span className="salary-label">Ср. опоздание</span><span className="salary-value">{d.avgLateMin} мин</span></div>}
        </div>

        <div className="section-title">Рабочее время</div>
        <div className="card">
          <div className="salary-row"><span className="salary-label">Check-in</span><span className="salary-value">{d.checkinCount} дней</span></div>
          <div className="salary-row"><span className="salary-label">Отработано</span><span className="salary-value">{d.totalHours} ч</span></div>
        </div>

        <div className="section-title">Ученики</div>
        <div className="card">
          <div className="salary-row"><span className="salary-label">Активных в {monthNames[month]}</span><span className="salary-value">{d.studentCount}</span></div>
        </div>
      </div>
    )
  }

  var teacherData = teachers.map(getTeacherData)
  teacherData.sort(function(a,b) { return b.totalLessons - a.totalLessons })

  return (
    <div className="page">
      <div className="greeting"><h1>Аналитика</h1><p>{monthNames[month]} {year}</p></div>

      <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
        <div><div style={{fontSize:20,fontWeight:700}}>{teachers.length}</div><div style={{fontSize:11,color:'var(--text2)'}}>Педагогов</div></div>
        <div><div style={{fontSize:20,fontWeight:700,color:'var(--green)'}}>{lessons.filter(function(l){return l.status==='approved'}).length}</div><div style={{fontSize:11,color:'var(--text2)'}}>Уроков</div></div>
        <div><div style={{fontSize:20,fontWeight:700,color:'var(--gold)'}}>{ratings.length}</div><div style={{fontSize:11,color:'var(--text2)'}}>Отзывов</div></div>
      </div>

      <div className="section-title">Педагоги</div>
      {teacherData.map(function(d, i) {
        var eff = d.totalLessons > 0 ? Math.round((d.present + d.late) / d.totalLessons * 100) : 0
        return (
          <div className="card" key={i} style={{cursor:'pointer'}} onClick={function(){setSelected(teachers[i])}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div className="avatar">{d.name[0]}</div>
              <div style={{flex:1}}>
                <div className="lesson-name">{d.name}</div>
                <div className="lesson-sub">{d.studentCount} учеников · {d.totalLessons} уроков</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:14,fontWeight:700,color:d.avgRating!=='—'&&d.avgRating>=4?'var(--green)':d.avgRating>=3?'var(--gold)':'var(--text)'}}>{d.avgRating} ⭐</div>
                <div style={{fontSize:10,color:'var(--text3)'}}>{d.ratingCount} отз.</div>
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <div style={{flex:1,background:'var(--bg3)',borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--green)'}}>{d.present}</div>
                <div style={{fontSize:9,color:'var(--text3)'}}>были</div>
              </div>
              <div style={{flex:1,background:'var(--bg3)',borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--gold)'}}>{d.late}</div>
                <div style={{fontSize:9,color:'var(--text3)'}}>опозд.</div>
              </div>
              <div style={{flex:1,background:'var(--bg3)',borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--red)'}}>{d.absent}</div>
                <div style={{fontSize:9,color:'var(--text3)'}}>нет</div>
              </div>
              <div style={{flex:1,background:'var(--bg3)',borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                <div style={{fontSize:14,fontWeight:700}}>{d.totalHours}ч</div>
                <div style={{fontSize:9,color:'var(--text3)'}}>часов</div>
              </div>
              <div style={{flex:1,background:'var(--bg3)',borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                <div style={{fontSize:14,fontWeight:700,color:eff>=80?'var(--green)':eff>=50?'var(--gold)':'var(--red)'}}>{eff}%</div>
                <div style={{fontSize:9,color:'var(--text3)'}}>эфф.</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
