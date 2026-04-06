import { useState, useEffect } from 'react'

export default function StudentHome({ user, onNavigate }) {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, attended: 0, missed: 0 })
  const firstName = user?.full_name?.split(' ')[0] || 'Ученик'

  useEffect(function() { loadData() }, [])

  async function loadData() {
    var phone = user.phone ? user.phone.replace('+', '') : ''
    if (!phone || phone === '-') {
      setLoading(false)
      return
    }

    try {
      var sr = await fetch('/api/altegio?action=search&phone=' + phone)
      var sd = await sr.json()
      if (!sd.ok || !sd.clients || sd.clients.length === 0) {
        setLoading(false)
        return
      }
      var clientName = sd.clients[0].name

      var now = new Date()
      var month = now.getMonth() + 1
      var year = now.getFullYear()
      var startDate = year + '-' + String(month).padStart(2,'0') + '-01'
      var endDate = year + '-' + String(month).padStart(2,'0') + '-31'

      var rr = await fetch('/api/altegio?action=records&date_from=' + startDate + '&date_to=' + endDate)
      var rd = await rr.json()
      if (rd.ok && rd.records) {
        var my = rd.records.filter(function(rec) {
          return rec.client && (rec.client.phone === phone || rec.client.display_name === clientName)
        })
        my.sort(function(a, b) { return a.date > b.date ? 1 : -1 })
        setLessons(my)
        var att = my.filter(function(r) { return r.attendance === 1 }).length
        var miss = my.filter(function(r) { return r.attendance === -1 }).length
        setStats({ total: my.length, attended: att, missed: miss })
      }
    } catch (e) { console.log(e) }
    setLoading(false)
  }

  function getAttBadge(att) {
    if (att === 1) return { text: 'Был', bg: '#E1F5EE', color: '#1D9E75' }
    if (att === -1) return { text: 'Пропуск', bg: '#FCEBEB', color: '#A32D2D' }
    return { text: 'Запланирован', bg: '#FAEEDA', color: '#854F0B' }
  }

  var today = new Date().toISOString().slice(0, 10)
  var todayLessons = lessons.filter(function(l) { return l.date.slice(0,10) === today })
  var upcomingLessons = lessons.filter(function(l) { return l.date.slice(0,10) > today })
  var pastLessons = lessons.filter(function(l) { return l.date.slice(0,10) < today })

  return (
    <div className="page">
      <div className="greeting">
        <h1>Привет, {firstName}!</h1>
        <p>{loading ? 'Загрузка...' : stats.total + ' уроков в этом месяце'}</p>
      </div>

      <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
        <div><div style={{fontSize:20,fontWeight:600}}>{stats.total}</div><div style={{fontSize:11,color:'#888'}}>Всего</div></div>
        <div><div style={{fontSize:20,fontWeight:600,color:'#1D9E75'}}>{stats.attended}</div><div style={{fontSize:11,color:'#888'}}>Посетил</div></div>
        <div><div style={{fontSize:20,fontWeight:600,color:'#A32D2D'}}>{stats.missed}</div><div style={{fontSize:11,color:'#888'}}>Пропуски</div></div>
      </div>

      {todayLessons.length > 0 && (
        <div>
          <div className="section-title">Сегодня</div>
          {todayLessons.map(function(rec) {
            var time = rec.date.slice(11,16)
            var service = rec.services && rec.services[0] ? rec.services[0].title : ''
            var teacher = rec.staff ? rec.staff.name : ''
            var badge = getAttBadge(rec.attendance)
            return (
              <div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:16,fontWeight:600}}>{time}</div><div style={{fontSize:11,color:'#888'}}>{Math.round(rec.length/60)}мин</div></div>
                <div style={{width:1,height:36,background:'#eee'}} />
                <div style={{flex:1}}>
                  <div className="lesson-name">{service}</div>
                  <div className="lesson-sub">{teacher}</div>
                </div>
                <span style={{fontSize:10,padding:'3px 6px',borderRadius:6,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
              </div>
            )
          })}
        </div>
      )}

      {upcomingLessons.length > 0 && (
        <div>
          <div className="section-title">Предстоящие</div>
          {upcomingLessons.slice(0,5).map(function(rec) {
            var date = rec.date.slice(5,10).split('-').reverse().join('.')
            var time = rec.date.slice(11,16)
            var service = rec.services && rec.services[0] ? rec.services[0].title : ''
            var teacher = rec.staff ? rec.staff.name : ''
            return (
              <div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:14,fontWeight:600}}>{date}</div><div style={{fontSize:12,color:'#888'}}>{time}</div></div>
                <div style={{width:1,height:36,background:'#eee'}} />
                <div style={{flex:1}}>
                  <div className="lesson-name">{service}</div>
                  <div className="lesson-sub">{teacher}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pastLessons.length > 0 && (
        <div>
          <div className="section-title">История ({pastLessons.length})</div>
          {pastLessons.slice(-10).reverse().map(function(rec) {
            var date = rec.date.slice(5,10).split('-').reverse().join('.')
            var time = rec.date.slice(11,16)
            var service = rec.services && rec.services[0] ? rec.services[0].title : ''
            var badge = getAttBadge(rec.attendance)
            return (
              <div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{minWidth:45,textAlign:'center'}}><div style={{fontSize:13,fontWeight:600}}>{date}</div><div style={{fontSize:11,color:'#888'}}>{time}</div></div>
                <div style={{width:1,height:30,background:'#eee'}} />
                <div style={{flex:1}}><div className="lesson-name" style={{fontSize:13}}>{service}</div></div>
                <span style={{fontSize:10,padding:'3px 6px',borderRadius:6,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
              </div>
            )
          })}
        </div>
      )}

      {!loading && lessons.length === 0 && (
        <div className="card" style={{textAlign:'center',color:'#888',fontSize:13}}>
          Уроки не найдены. Убедитесь что ваш номер телефона совпадает с номером в школе.
        </div>
      )}
    </div>
  )
}
