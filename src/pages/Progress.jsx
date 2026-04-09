import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Progress({ user }) {
  const [records, setRecords] = useState([])
  const [notes, setNotes] = useState([])
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(function() { loadData() }, [])

  async function loadData() {
    var phone = user.phone ? user.phone.replace('+', '') : ''
    var clientId = user.altegio_client_id

    if (!clientId && !phone) { setLoading(false); return }

    try {
      var clientName = ''
      if (phone) {
        var sr = await fetch('/api/altegio?action=search&phone=' + phone)
        var sd = await sr.json()
        if (sd.ok && sd.clients && sd.clients.length > 0) {
          if (clientId) {
            var found = sd.clients.find(function(c) { return c.id === clientId })
            if (found) clientName = found.name
          } else {
            clientId = sd.clients[0].id
            clientName = sd.clients[0].name
          }
        }
      }

      var now = new Date()
      var year = now.getFullYear()
      var start = year + '-01-01'
      var end = year + '-12-31'

      var rr = await fetch('/api/altegio?action=records&date_from=' + start + '&date_to=' + end)
      var rd = await rr.json()
      if (rd.ok && rd.records) {
        var my = rd.records.filter(function(rec) {
          if (!rec.client) return false
          if (clientId && rec.client.id === clientId) return true
          if (clientName && rec.client.display_name === clientName) return true
          return false
        })
        setRecords(my)
      }
    } catch (e) { console.log(e) }

    var { data: n } = await supabase.from('teacher_notes').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(20)
    if (n) setNotes(n)

    var { data: r } = await supabase.from('lesson_ratings').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(20)
    if (r) setRatings(r)

    setLoading(false)
  }

  var byInstrument = {}
  records.forEach(function(rec) {
    var service = rec.services && rec.services[0] ? rec.services[0].title : 'Другое'
    if (!byInstrument[service]) byInstrument[service] = { total: 0, attended: 0, missed: 0 }
    byInstrument[service].total++
    if (rec.attendance === 1) byInstrument[service].attended++
    if (rec.attendance === -1) byInstrument[service].missed++
  })
  var instruments = Object.keys(byInstrument)

  var byMonth = {}
  records.forEach(function(rec) {
    var m = rec.date.slice(0, 7)
    if (!byMonth[m]) byMonth[m] = { total: 0, attended: 0 }
    byMonth[m].total++
    if (rec.attendance === 1) byMonth[m].attended++
  })
  var months = Object.keys(byMonth).sort()
  var monthNames = { '01':'Янв','02':'Фев','03':'Мар','04':'Апр','05':'Май','06':'Июн','07':'Июл','08':'Авг','09':'Сен','10':'Окт','11':'Ноя','12':'Дек' }

  var totalAll = records.length
  var attendedAll = records.filter(function(r) { return r.attendance === 1 }).length
  var percent = totalAll > 0 ? Math.round(attendedAll / totalAll * 100) : 0

  function getLevel(count) {
    if (count >= 50) return { name: 'Продвинутый', color: 'var(--gold)', width: '100%' }
    if (count >= 20) return { name: 'Средний', color: 'var(--blue)', width: Math.round(count / 50 * 100) + '%' }
    return { name: 'Начинающий', color: 'var(--green)', width: Math.round(count / 50 * 100) + '%' }
  }

  if (loading) return <div className="page"><div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div></div>

  return (
    <div className="page">
      <div className="greeting"><h1>Мой прогресс</h1><p>{new Date().getFullYear()} год</p></div>

      <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
        <div><div style={{fontSize:24,fontWeight:700}}>{totalAll}</div><div style={{fontSize:11,color:'var(--text2)'}}>Всего уроков</div></div>
        <div><div style={{fontSize:24,fontWeight:700,color:'var(--green)'}}>{attendedAll}</div><div style={{fontSize:11,color:'var(--text2)'}}>Посетил</div></div>
        <div><div style={{fontSize:24,fontWeight:700,color:percent>=80?'var(--green)':percent>=50?'var(--gold)':'var(--red)'}}>{percent}%</div><div style={{fontSize:11,color:'var(--text2)'}}>Посещаемость</div></div>
      </div>

      {instruments.length > 0 && <div className="section-title">По инструментам</div>}
      {instruments.map(function(name) {
        var data = byInstrument[name]
        var level = getLevel(data.attended)
        return (
          <div className="card" key={name}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div className="lesson-name">{name}</div>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:8,background:level.color==='var(--gold)'?'var(--gold-light)':level.color==='var(--blue)'?'var(--blue-light)':'var(--green-light)',color:level.color,fontWeight:600}}>{level.name}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text2)',marginBottom:6}}>
              <span>{data.attended} из {data.total} уроков</span>
              <span>{data.missed > 0 ? data.missed + ' пропусков' : 'Без пропусков'}</span>
            </div>
            <div className="progress-bar" style={{width:'100%',height:8}}>
              <div className="progress-fill" style={{width:level.width,height:'100%'}} />
            </div>
          </div>
        )
      })}

      {months.length > 0 && <div className="section-title">По месяцам</div>}
      {months.length > 0 && (
        <div className="card">
          {months.map(function(m) {
            var d = byMonth[m]
            var mn = monthNames[m.slice(5,7)] || m
            var pct = d.total > 0 ? Math.round(d.attended / d.total * 100) : 0
            return (
              <div key={m} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{minWidth:36,fontSize:13,fontWeight:600}}>{mn}</div>
                <div style={{flex:1}}>
                  <div style={{background:'var(--bg3)',borderRadius:4,height:6,overflow:'hidden'}}>
                    <div style={{width:pct+'%',height:'100%',background:pct>=80?'var(--green)':pct>=50?'var(--gold)':'var(--red)',borderRadius:4}} />
                  </div>
                </div>
                <div style={{minWidth:60,textAlign:'right',fontSize:12,color:'var(--text2)'}}>{d.attended}/{d.total}</div>
              </div>
            )
          })}
        </div>
      )}

      {notes.length > 0 && <div className="section-title">Заметки педагога</div>}
      {notes.map(function(n) {
        return (
          <div className="card" key={n.id}>
            <div className="lesson-sub">{new Date(n.created_at).toLocaleDateString('ru')}</div>
            <div style={{fontSize:14,marginTop:4}}>{n.note_text}</div>
          </div>
        )
      })}

      {records.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Данные появятся после первых уроков</div>}
    </div>
  )
}
