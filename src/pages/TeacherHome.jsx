import { useState } from 'react'
import LessonCard from '../components/LessonCard'
import { supabase } from '../lib/supabase'

export default function TeacherHome({ user }) {
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState('Отметить приход')
  const [subText, setSubText] = useState('Нажмите для check-in')
  const [gpsError, setGpsError] = useState(null)
  const firstName = user?.full_name?.split(' ')[0] || 'Педагог'

  var branches = [
    { name: 'Ганди 44', lat: 41.31547, lng: 69.29919 },
    { name: 'Ганди 29', lat: 41.31529, lng: 69.29772 }
  ]

  function getDistance(lat1, lng1, lat2, lng2) {
    var R = 6371000
    var a1 = lat1 * Math.PI / 180
    var a2 = lat2 * Math.PI / 180
    var d1 = (lat2 - lat1) * Math.PI / 180
    var d2 = (lng2 - lng1) * Math.PI / 180
    var a = Math.sin(d1/2) * Math.sin(d1/2) + Math.cos(a1) * Math.cos(a2) * Math.sin(d2/2) * Math.sin(d2/2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  function findNearestBranch(lat, lng) {
    var nearest = null
    var minDist = 999999
    for (var i = 0; i < branches.length; i++) {
      var dist = getDistance(lat, lng, branches[i].lat, branches[i].lng)
      if (dist < minDist) { minDist = dist; nearest = branches[i] }
    }
    return { branch: nearest, distance: Math.round(minDist) }
  }

  function handleCheckIn() {
    if (checkedIn) return
    setCheckInStatus('Определяем локацию...')
    setSubText('Подождите')
    if (!navigator.geolocation) {
      setCheckInStatus('GPS недоступен')
      setSubText('Браузер не поддерживает')
      return
    }
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        var lat = pos.coords.latitude
        var lng = pos.coords.longitude
        var result = findNearestBranch(lat, lng)
        var maxDistance = 500
        if (result.distance > maxDistance) {
          setCheckInStatus('Слишком далеко')
          setSubText(result.branch.name + ' — ' + result.distance + 'м')
          setGpsError(true)
          setTimeout(function() { setCheckInStatus('Отметить приход'); setSubText('Нажмите для check-in'); setGpsError(null) }, 3000)
          return
        }
        var now = new Date()
        var timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0')
        supabase.from('checkins').insert({ teacher_id: user.id, branch_name: result.branch.name, check_in_at: now.toISOString(), check_in_lat: lat, check_in_lng: lng })
        setCheckedIn(true)
        setCheckInStatus('На смене')
        setSubText(result.branch.name + ' · Приход: ' + timeStr + ' · ' + result.distance + 'м')
      },
      function() {
        setCheckInStatus('Ошибка GPS')
        setSubText('Разрешите геолокацию')
        setTimeout(function() { setCheckInStatus('Отметить приход'); setSubText('Нажмите для check-in') }, 3000)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function handleCheckOut() {
    var now = new Date()
    var timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0')
    setCheckedIn(false)
    setCheckInStatus('Смена завершена')
    setSubText('Уход: ' + timeStr)
  }

  return (
    <div className="page">
      <div className="greeting">
        <h1>{firstName}, добрый день</h1>
        <p>Филиалы: Ганди 44, Ганди 29</p>
      </div>
      <div className="card checkin-card">
        <button className={'checkin-btn' + (checkedIn ? ' checked' : '')} onClick={handleCheckIn}>{checkedIn ? '✓' : '📍'}</button>
        <div className="checkin-label">{checkInStatus}</div>
        <div className="checkin-sub">{subText}</div>
        {checkedIn && (
          <button className="btn btn-secondary" style={{ marginTop: 12, width: 'auto', display: 'inline-block', padding: '8px 24px' }} onClick={handleCheckOut}>Отметить уход</button>
        )}
      </div>
      <div className="section-title">Уроки сегодня</div>
      <LessonCard time="14:00" name="Марк Ли" sub="Гитара" badge="Проведён" badgeType="done" />
      <LessonCard time="15:00" name="Азиз Н." sub="Гитара" badge="Следующий" badgeType="upcoming" />
      <LessonCard time="16:00" name="Алина К." sub="Гитара" />
      <LessonCard time="17:00" name="Группа (4)" sub="Гитара групп." />
      <LessonCard time="18:30" name="Тимур Р." sub="Гитара" />
    </div>
  )
}
