import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function TeacherHome({ user }) {
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkinId, setCheckinId] = useState(null)
  const [checkinTime, setCheckinTime] = useState(null)
  const [checkInStatus, setCheckInStatus] = useState('Отметить приход')
  const [subText, setSubText] = useState('Нажмите для check-in')
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const firstName = user?.full_name?.split(' ')[0] || 'Педагог'

  var branches = [
    { name: 'Ганди 44', lat: 41.31547, lng: 69.29919 },
    { name: 'Ганди 29', lat: 41.31529, lng: 69.29772 }
  ]

  useEffect(function() { loadLessons(); checkExisting() }, [])

  async function checkExisting() {
    var today = new Date().toISOString().slice(0,10)
    var { data } = await supabase.from('checkins').select('*').eq('teacher_id', user.id).gte('check_in_at', today).is('check_out_at', null).single()
    if (data) {
      setCheckedIn(true); setCheckinId(data.id); setCheckinTime(new Date(data.check_in_at))
      var t = new Date(data.check_in_at)
      setCheckInStatus('На смене'); setSubText(data.branch_name + ' · с ' + t.getHours() + ':' + String(t.getMinutes()).padStart(2,'0'))
    }
  }

  async function loadLessons() {
    var today = new Date().toISOString().slice(0,10)
    var dayOfWeek = new Date().getDay()
    var all = []

    if (user.altegio_staff_id) {
      try {
        var r = await fetch('/api/altegio?action=records&date_from=' + today + '&date_to=' + today)
        var data = await r.json()
        if (data.ok && data.records) {
          var filtered = data.records.filter(function(rec) { return rec.staff_id === user.altegio_staff_id })
          filtered.forEach(function(rec) {
            all.push({
              id: 'a-' + rec.id,
              time: rec.date.slice(11,16),
              client: rec.client ? rec.client.display_name : '—',
              service: rec.services && rec.services[0] ? rec.services[0].title : '',
              duration: Math.round(rec.length/60),
              attendance: rec.attendance,
              source: 'altegio'
            })
          })
        }
      } catch (e) {}
    }

    var { data: local } = await supabase.from('schedule').select('*').eq('teacher_id', user.id).eq('status', 'active').or('lesson_date.eq.' + today + ',and(repeat_weekly.eq.true,day_of_week.eq.' + dayOfWeek + ')')
    if (local) {
      local.forEach(function(item) {
        all.push({
          id: 'l-' + item.id,
          time: item.lesson_time,
          client: item.student_name,
          service: item.instrument,
          duration: item.lesson_duration,
          attendance: 0,
          source: 'local'
        })
      })
    }

    all.sort(function(a,b) { return a.time > b.time ? 1 : -1 })
    setLessons(all)
    setLoading(false)
  }

  function getDistance(lat1, lng1, lat2, lng2) {
    var R = 6371000, a1 = lat1*Math.PI/180, a2 = lat2*Math.PI/180, d1 = (lat2-lat1)*Math.PI/180, d2 = (lng2-lng1)*Math.PI/180
    var a = Math.sin(d1/2)*Math.sin(d1/2) + Math.cos(a1)*Math.cos(a2)*Math.sin(d2/2)*Math.sin(d2/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  function findNearest(lat, lng) {
    var nearest = null, minDist = 999999
    for (var i = 0; i < branches.length; i++) { var dist = getDistance(lat, lng, branches[i].lat, branches[i].lng); if (dist < minDist) { minDist = dist; nearest = branches[i] } }
    return { branch: nearest, distance: Math.round(minDist) }
  }

  function handleCheckIn() {
    if (checkedIn) return
    setCheckInStatus('Определяем...')
    navigator.geolocation.getCurrentPosition(
      async function(pos) {
        var result = findNearest(pos.coords.latitude, pos.coords.longitude)
        if (result.distance > 500) { setCheckInStatus('Далеко: ' + result.distance + 'м'); setSubText(result.branch.name); setTimeout(function(){setCheckInStatus('Отметить приход');setSubText('Нажмите для check-in')}, 3000); return }
        var now = new Date()
        var { data } = await supabase.from('checkins').insert({ teacher_id: user.id, branch_name: result.branch.name, check_in_at: now.toISOString(), check_in_lat: pos.coords.latitude, check_in_lng: pos.coords.longitude }).select().single()
        if (data) { setCheckedIn(true); setCheckinId(data.id); setCheckinTime(now); setCheckInStatus('На смене'); setSubText(result.branch.name + ' · с ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0') + ' · ' + result.distance + 'м') }
      },
      function() { setCheckInStatus('Ошибка GPS'); setTimeout(function(){setCheckInStatus('Отметить приход')}, 3000) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleCheckOut() {
    var now = new Date()
    var totalMin = checkinTime ? Math.round((now - checkinTime) / 60000) : 0
    await supabase.from('checkins').update({ check_out_at: now.toISOString(), total_minutes: totalMin }).eq('id', checkinId)
    setCheckedIn(false); setCheckinId(null)
    setCheckInStatus('Смена: ' + Math.floor(totalMin/60) + 'ч ' + (totalMin%60) + 'м')
    setSubText('Уход: ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0'))
  }

  function getAttBadge(att) {
    if (att === 1) return { text: 'Был', bg: 'var(--green-light)', color: 'var(--green)' }
    if (att === -1) return { text: 'Нет', bg: 'var(--red-light)', color: 'var(--red)' }
    return { text: 'Ждёт', bg: 'var(--gold-light)', color: 'var(--gold)' }
  }

  return (
    <div className="page">
      <div className="greeting"><h1>{firstName}, добрый день</h1><p>{lessons.length} уроков сегодня</p></div>
      <div className="card checkin-card">
        <button className={'checkin-btn' + (checkedIn ? ' checked' : '')} onClick={handleCheckIn}>{checkedIn ? '✓' : '📍'}</button>
        <div className="checkin-label">{checkInStatus}</div>
        <div className="checkin-sub">{subText}</div>
        {checkedIn && <button className="btn btn-secondary" style={{marginTop:12,width:'auto',padding:'8px 24px'}} onClick={handleCheckOut}>Отметить уход</button>}
      </div>
      <div className="section-title">Уроки сегодня</div>
      {loading && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}
      {!loading && lessons.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет уроков на сегодня</div>}
      {lessons.map(function(l) {
        var badge = getAttBadge(l.attendance)
        return (
          <div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'var(--gold)'}}>{l.time}</div><div style={{fontSize:11,color:'var(--text3)'}}>{l.duration}м</div></div>
            <div style={{width:1,height:36,background:'var(--border)'}} />
            <div style={{flex:1}}>
              <div className="lesson-name">{l.client}</div>
              <div className="lesson-sub">{l.service} <span style={{fontSize:9,color:l.source==='altegio'?'var(--blue)':'var(--gold)'}}>{l.source==='altegio'?'Altegio':'Добавлен'}</span></div>
            </div>
            <span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
          </div>
        )
      })}
    </div>
  )
}import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function TeacherHome({ user }) {
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkinId, setCheckinId] = useState(null)
  const [checkinTime, setCheckinTime] = useState(null)
  const [checkInStatus, setCheckInStatus] = useState('Отметить приход')
  const [subText, setSubText] = useState('Нажмите для check-in')
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const firstName = user?.full_name?.split(' ')[0] || 'Педагог'

  var branches = [
    { name: 'Ганди 44', lat: 41.31547, lng: 69.29919 },
    { name: 'Ганди 29', lat: 41.31529, lng: 69.29772 }
  ]

  useEffect(function() { loadLessons(); checkExisting() }, [])

  async function checkExisting() {
    var today = new Date().toISOString().slice(0,10)
    var { data } = await supabase.from('checkins').select('*').eq('teacher_id', user.id).gte('check_in_at', today).is('check_out_at', null).single()
    if (data) {
      setCheckedIn(true); setCheckinId(data.id); setCheckinTime(new Date(data.check_in_at))
      var t = new Date(data.check_in_at)
      setCheckInStatus('На смене'); setSubText(data.branch_name + ' · с ' + t.getHours() + ':' + String(t.getMinutes()).padStart(2,'0'))
    }
  }

  async function loadLessons() {
    var today = new Date().toISOString().slice(0,10)
    var dayOfWeek = new Date().getDay()
    var all = []

    if (user.altegio_staff_id) {
      try {
        var r = await fetch('/api/altegio?action=records&date_from=' + today + '&date_to=' + today)
        var data = await r.json()
        if (data.ok && data.records) {
          var filtered = data.records.filter(function(rec) { return rec.staff_id === user.altegio_staff_id })
          filtered.forEach(function(rec) {
            all.push({
              id: 'a-' + rec.id,
              time: rec.date.slice(11,16),
              client: rec.client ? rec.client.display_name : '—',
              service: rec.services && rec.services[0] ? rec.services[0].title : '',
              duration: Math.round(rec.length/60),
              attendance: rec.attendance,
              source: 'altegio'
            })
          })
        }
      } catch (e) {}
    }

    // ФИКС: start_date вместо lesson_date
    var { data: local } = await supabase.from('schedule').select('*').eq('teacher_id', user.id).eq('status', 'active').or('start_date.eq.' + today + ',and(repeat_weekly.eq.true,day_of_week.eq.' + dayOfWeek + ')')
    if (local) {
      local.forEach(function(item) {
        all.push({
          id: 'l-' + item.id,
          time: item.lesson_time,
          client: item.student_name,
          service: item.instrument,
          duration: item.lesson_duration,
          attendance: 0,
          source: 'local'
        })
      })
    }

    all.sort(function(a,b) { return a.time > b.time ? 1 : -1 })
    setLessons(all)
    setLoading(false)
  }

  function getDistance(lat1, lng1, lat2, lng2) {
    var R = 6371000, a1 = lat1*Math.PI/180, a2 = lat2*Math.PI/180, d1 = (lat2-lat1)*Math.PI/180, d2 = (lng2-lng1)*Math.PI/180
    var a = Math.sin(d1/2)*Math.sin(d1/2) + Math.cos(a1)*Math.cos(a2)*Math.sin(d2/2)*Math.sin(d2/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  function findNearest(lat, lng) {
    var nearest = null, minDist = 999999
    for (var i = 0; i < branches.length; i++) { var dist = getDistance(lat, lng, branches[i].lat, branches[i].lng); if (dist < minDist) { minDist = dist; nearest = branches[i] } }
    return { branch: nearest, distance: Math.round(minDist) }
  }

  function handleCheckIn() {
    if (checkedIn) return
    setCheckInStatus('Определяем...')
    navigator.geolocation.getCurrentPosition(
      async function(pos) {
        var result = findNearest(pos.coords.latitude, pos.coords.longitude)
        if (result.distance > 500) { setCheckInStatus('Далеко: ' + result.distance + 'м'); setSubText(result.branch.name); setTimeout(function(){setCheckInStatus('Отметить приход');setSubText('Нажмите для check-in')}, 3000); return }
        var now = new Date()
        var { data } = await supabase.from('checkins').insert({ teacher_id: user.id, branch_name: result.branch.name, check_in_at: now.toISOString(), check_in_lat: pos.coords.latitude, check_in_lng: pos.coords.longitude }).select().single()
        if (data) { setCheckedIn(true); setCheckinId(data.id); setCheckinTime(now); setCheckInStatus('На смене'); setSubText(result.branch.name + ' · с ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0') + ' · ' + result.distance + 'м') }
      },
      function() { setCheckInStatus('Ошибка GPS'); setTimeout(function(){setCheckInStatus('Отметить приход')}, 3000) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleCheckOut() {
    var now = new Date()
    var totalMin = checkinTime ? Math.round((now - checkinTime) / 60000) : 0
    await supabase.from('checkins').update({ check_out_at: now.toISOString(), total_minutes: totalMin }).eq('id', checkinId)
    setCheckedIn(false); setCheckinId(null)
    setCheckInStatus('Смена: ' + Math.floor(totalMin/60) + 'ч ' + (totalMin%60) + 'м')
    setSubText('Уход: ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0'))
  }

  function getAttBadge(att) {
    if (att === 1) return { text: 'Был', bg: 'var(--green-light)', color: 'var(--green)' }
    if (att === -1) return { text: 'Нет', bg: 'var(--red-light)', color: 'var(--red)' }
    return { text: 'Ждёт', bg: 'var(--gold-light)', color: 'var(--gold)' }
  }

  return (
    <div className="page">
      <div className="greeting"><h1>{firstName}, добрый день</h1><p>{lessons.length} уроков сегодня</p></div>
      <div className="card checkin-card">
        <button className={'checkin-btn' + (checkedIn ? ' checked' : '')} onClick={handleCheckIn}>{checkedIn ? '✓' : '📍'}</button>
        <div className="checkin-label">{checkInStatus}</div>
        <div className="checkin-sub">{subText}</div>
        {checkedIn && <button className="btn btn-secondary" style={{marginTop:12,width:'auto',padding:'8px 24px'}} onClick={handleCheckOut}>Отметить уход</button>}
      </div>
      <div className="section-title">Уроки сегодня</div>
      {loading && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}
      {!loading && lessons.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет уроков на сегодня</div>}
      {lessons.map(function(l) {
        var badge = getAttBadge(l.attendance)
        return (
          <div className="card" key={l.id} style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{minWidth:50,textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'var(--gold)'}}>{l.time}</div><div style={{fontSize:11,color:'var(--text3)'}}>{l.duration}м</div></div>
            <div style={{width:1,height:36,background:'var(--border)'}} />
            <div style={{flex:1}}>
              <div className="lesson-name">{l.client}</div>
              <div className="lesson-sub">{l.service} <span style={{fontSize:9,color:l.source==='altegio'?'var(--blue)':'var(--gold)'}}>{l.source==='altegio'?'Altegio':'Добавлен'}</span></div>
            </div>
            <span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
          </div>
        )
      })}
    </div>
  )
}
