import { useState } from 'react'
import LessonCard from '../components/LessonCard'

export default function TeacherHome({ user }) {
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState('Отметить приход')
  const [subText, setSubText] = useState('Нажмите для check-in')
  const firstName = user?.full_name?.split(' ')[0] || 'Педагог'

  function handleCheckIn() {
    if (checkedIn) return
    const now = new Date()
    const timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0')
    setCheckedIn(true)
    setCheckInStatus('На смене')
    setSubText('Приход: ' + timeStr)
  }

  function handleCheckOut() {
    const now = new Date()
    const timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0')
    setCheckedIn(false)
    setCheckInStatus('Смена завершена')
    setSubText('Уход: ' + timeStr)
  }

  return (
    <div className="page">
      <div className="greeting">
        <h1>{firstName}, добрый день</h1>
        <p>Сегодня 5 уроков</p>
      </div>
      <div className="card checkin-card">
        <button className={`checkin-btn ${checkedIn ? 'checked' : ''}`} onClick={handleCheckIn}>O</button>
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
