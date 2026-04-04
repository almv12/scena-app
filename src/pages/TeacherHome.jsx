import { useState, useEffect } from 'react'
import LessonCard from '../components/LessonCard'
import { supabase } from '../lib/supabase'

export default function TeacherHome({ user }) {
const [checkedIn, setCheckedIn] = useState(false)
const [checkInStatus, setCheckInStatus] = useState('Отметить приход')
const [subText, setSubText] = useState('Нажмите для check-in')
const [showForm, setShowForm] = useState(null)
const [note, setNote] = useState('')
const [attendance, setAttendance] = useState('present')
const [lateMins, setLateMins] = useState(0)
const [todayLessons, setTodayLessons] = useState([])
const firstName = user?.full_name?.split(' ')[0] || 'Педагог'

var demoLessons = [
{ time: '14:00', name: 'Марк Ли', sub: 'Гитара', type: 'individual', instrument: 'Гитара' },
{ time: '15:00', name: 'Азиз Н.', sub: 'Гитара', type: 'individual', instrument: 'Гитара' },
{ time: '16:00', name: 'Алина К.', sub: 'Гитара', type: 'individual', instrument: 'Гитара' },
{ time: '17:00', name: 'Группа (4)', sub: 'Гитара групп.', type: 'group', instrument: 'Гитара' },
{ time: '18:30', name: 'Тимур Р.', sub: 'Гитара', type: 'individual', instrument: 'Гитара' }
]

var branches = [
{ name: 'Ганди 44', lat: 41.31547, lng: 69.29919 },
{ name: 'Ганди 29', lat: 41.31529, lng: 69.29772 }
]

useEffect(function() { loadToday() }, [])

async function loadToday() {
var today = new Date().toISOString().split('T')[0]
var { data } = await supabase.from('conducted_lessons').select('*').eq('teacher_id', user.id).eq('lesson_date', today)
if (data) setTodayLessons(data)
}

function isLessonDone(lessonName) {
return todayLessons.find(function(l) { return l.student_name === lessonName })
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
var d = getDistance(lat, lng, branches[i].lat, branches[i].lng)
if (d < minDist) { minDist = d; nearest = branches[i] }
}
return { branch: nearest, distance: Math.round(minDist) }
}

function handleCheckIn() {
if (checkedIn) return
setCheckInStatus('Определяем...')
if (!navigator.geolocation) { setCheckInStatus('GPS недоступен'); return }
navigator.geolocation.getCurrentPosition(function(pos) {
var r = findNearestBranch(pos.coords.latitude, pos.coords.longitude)
if (r.distance > 500) {
setCheckInStatus('Далеко: ' + r.distance + 'м')
setSubText(r.branch.name)
setTimeout(function() { setCheckInStatus('Отметить приход'); setSubText('Нажмите для check-in') }, 3000)
return
}
var now = new Date()
var t = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0')
supabase.from('checkins').insert({ teacher_id: user.id, branch_name: r.branch.name, check_in_at: now.toISOString(), check_in_lat: pos.coords.latitude, check_in_lng: pos.coords.longitude })
setCheckedIn(true)
setCheckInStatus('На смене')
setSubText(r.branch.name + ' · ' + t + ' · ' + r.distance + 'м')
}, function() {
setCheckInStatus('Разрешите GPS')
setTimeout(function() { setCheckInStatus('Отметить приход') }, 3000)
}, { enableHighAccuracy: true, timeout: 10000 })
}

function handleCheckOut() {
var now = new Date()
setCheckedIn(false)
setCheckInStatus('Смена завершена')
setSubText('Уход: ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0'))
}

async function markLesson() {
var lesson = showForm
var today = new Date().toISOString().split('T')[0]
var { data, error } = await supabase.from('conducted_lessons').insert({
teacher_id: user.id,
student_name: lesson.name,
instrument: lesson.instrument,
lesson_type: lesson.type,
lesson_date: today,
lesson_time: lesson.time,
status: 'pending',
attendance: attendance,
late_minutes: attendance === 'late' ? lateMins : 0,
note: note
}).select().single()
if (error) { alert(JSON.stringify(error)); return }
setShowForm(null)
setNote('')
setAttendance('present')
setLateMins(0)
loadToday()
}

if (showForm) {
return (
<div className="page">
<div className="breadcrumb">
<button onClick={function() { setShowForm(null) }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg></button>
<span>Отметить урок</span>
</div>
<div className="card">
<div className="lesson-name">{showForm.name}</div>
<div className="lesson-sub">{showForm.time} · {showForm.sub}</div>
</div>
<div className="section-title">Посещение</div>
<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
{[['present','Был'],['late','Опоздал'],['absent','Не пришёл'],['cancelled','Отменён']].map(function(item) {
return <button key={item[0]} className={'btn ' + (attendance === item[0] ? 'btn-primary' : 'btn-secondary')} style={{ flex: 1, padding: 10, minWidth: 70 }} onClick={function() { setAttendance(item[0]) }}>{item[1]}</button>
})}
</div>
{attendance === 'late' && (
<div style={{ marginTop: 8 }}>
<div className="lesson-sub">На сколько минут опоздал?</div>
<input type="number" value={lateMins} onChange={function(e) { setLateMins(Number(e.target.value)) }} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 16, marginTop: 4 }} />
</div>
)}
<div className="section-title">Заметка</div>
<textarea rows="3" value={note} onChange={function(e) { setNote(e.target.value) }} placeholder="Что прошли, домашнее задание..." />
<button className="btn btn-primary" onClick={markLesson} style={{ marginTop: 8 }}>Отметить урок</button>
</div>
)
}

return (
<div className="page">
<div className="greeting">
<h1>{firstName}, добрый день</h1>
<p>Сегодня {demoLessons.length} уроков</p>
</div>
<div className="card checkin-card">
<button className={'checkin-btn' + (checkedIn ? ' checked' : '')} onClick={handleCheckIn}>{checkedIn ? '✓' : '📍'}</button>
<div className="checkin-label">{checkInStatus}</div>
<div className="checkin-sub">{subText}</div>
{checkedIn && <button className="btn btn-secondary" style={{ marginTop: 12, width: 'auto', display: 'inline-block', padding: '8px 24px' }} onClick={handleCheckOut}>Отметить уход</button>}
</div>
<div className="section-title">Уроки сегодня</div>
{demoLessons.map(function(lesson, i) {
var done = isLessonDone(lesson.name)
return (
<div key={i} className="card card-click" onClick={function() { if (!done) setShowForm(lesson) }}>
<div className="lesson">
<div><div className="lesson-time">{lesson.time}</div></div>
<div className="lesson-divider"></div>
<div className="lesson-info">
<div className="lesson-name">{lesson.name}</div>
<div className="lesson-sub">{lesson.sub}</div>
</div>
{done && <span className="badge badge-done">{done.status === 'approved' ? 'Подтверждён' : 'На проверке'}</span>}
</div>
</div>
)
})}
</div>
)
}
