import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function TeacherHome({ user }) {
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState('Отметить приход')
  const [subText, setSubText] = useState('Нажмите для check-in')
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const firstName = user?.full_name?.split(' ')[0] || 'Педагог'

  var branches = [
    { name: 'Ганди 44', lat: 41.31547, lng: 69.29919 },
    { name: 'Ганди 29', lat: 41.31529, lng: 69.29772 }
  ]

  useEffect(function() { loadLessons() }, [])

  async function loadLessons() {
    var today = new Date().toISOString().slice(0, 10)
    try {
      var r = await fetch('/api/altegio?action=records&date_from=' + today + '&date_to=' + today)
      var data = await r.json()
      if (data.ok && data.records) {
        var staffId = user.altegio_staff_id
        var filtered = staffId ? data.records.filter(function(rec) { return rec.staff_id === staffId }) : data.records
        filtered.sort(function(a, b) { return a.date > b.date ? 1 : -1 })
        setLessons(filtered)
      }
    } catch (e) { console.log(e) }
    setLoading(false)
  }

  function getDistance(lat1, lng1, lat2, lng2) {
    var R = 6371000
    var a1 = lat1 * Math.PI / 180
    var a2 = lat2 * Math.PI / 180
    var d1 = (lat2 - lat1) * Math.PI / 180
    var d2 = (lng2 - lng1) * Math.PI / 180
    var a = Math.sin(d1/2) * Math.sin(d1/2) + Math.cos(a1) * Math.cos(a2) * Math.sin(d2/2) * Math.sin(d2/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  function findNearestBranch(lat, lng) {
    var nearest = null, minDist = 999999
    for (var i = 0; i < branches.length; i++) {
      var dist = getDistance(lat, lng, branches[i].lat, branches[i].lng)
      if (dist < minDist) { minDist = dist; nearest = branches[i] }
    }
    return { branch: nearest, distance: Math.round(minDist) }
  }

  function handleCheckIn() {
    if (checkedIn) return
    setCheckInStatus('Определяем...')
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        var result = findNearestBranch(pos.coords.latitude, pos.coords.longitude)
        if (result.distance > 500) {
          setCheckInStatus('Далеко: ' + result.distance + 'м')
          setSubText(result.branch.name)
          setTimeout(function() { setCheckInStatus('Отметить приход'); setSubText('Нажмите для check-in') }, 3000)
          return
        }
        var now = new Date()
        supabase.from('checkins').insert({ teacher_id: user.id, branch_name: result.branch.name, check_in_at: now.toISOString(), check_in_lat: pos.coords.latitude, check_in_lng: pos.coords.longitude })
        setCheckedIn(true)
        setCheckInStatus('На смене')
        setSubText(result.branch.name + ' · ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0') + ' · ' + result.distance + 'м')
      },
      function() { setCheckInStatus('Ошибка GPS'); setTimeout(function() { setCheckInStatus('Отметить приход') }, 3000) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function getAttBadge(att) {
    if (att === 1) return { text: 'Был', cls: 'badge-done' }
    if (att === -1) return { text: 'Не пришёл', cls: 'badge-cancel' }
    return { text: 'Ожидает', cls: 'badge-upcoming' }
  }

  return (
    <div className="page">
      <div className="greeting">
        <h1>{firstName}, добрый день</h1>
        <p>{lessons.length} уроков сегодня</p>
      </div>
      <div className="card checkin-card">
        <button className={'checkin-btn' + (checkedIn ? ' checked' : '')} onClick={handleCheckIn}>{checkedIn ? '✓' : '📍'}</button>
        <div className="checkin-label">{checkInStatus}</div>
        <div className="checkin-sub">{subText}</div>
        {checkedIn && <button className="btn btn-secondary" style={{marginTop:12,width:'auto',padding:'8px 24px'}} onClick={function(){setCheckedIn(false);setCheckInStatus('Смена завершена')}}>Уход</button>}
      </div>
      <div className="section-title">Уроки сегодня</div>
      {loading && <div className="card" style={{color:'#888',fontSize:13}}>Загрузка...</div>}
      {!loading && lessons.length === 0 && <div className="card" style={{color:'#888',fontSize:13}}>Нет уроков на сегодня</div>}
      {lessons.map(function(rec) {
        var time = rec.date.slice(11, 16)
        var clientName = rec.client ? rec.client.display_name : 'Без имени'
        var service = rec.services && rec.services[0] ? rec.services[0].title : ''
        var badge = getAttBadge(rec.attendance)
        return (
          <div className="card" key={rec.id} style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{minWidth:50,textAlign:'center'}}>
              <div style={{fontSize:16,fontWeight:600}}>{time}</div>
              <div style={{fontSize:11,color:'#888'}}>{Math.round(rec.length/60)}мин</div>
            </div>
            <div style={{width:1,height:36,background:'#eee'}} />
            <div style={{flex:1}}>
              <div className="lesson-name">{clientName}</div>
              <div className="lesson-sub">{service} {rec.staff ? '· ' + rec.staff.name : ''}</div>
            </div>
            <span className={'badge ' + badge.cls}>{badge.text}</span>
          </div>
        )
      })}
    </div>
  )
}
