import { useState, useEffect } from 'react'
import './App.css'
import Login from './pages/Login'
import StudentHome from './pages/StudentHome'
import TeacherHome from './pages/TeacherHome'
import BottomNav from './components/BottomNav'
import Salary from './pages/Salary'
import MarkLesson from './pages/MarkLesson'
import Admin from './pages/Admin'
import Approve from './pages/Approve'
import Progress from './pages/Progress'
import Ratings from './pages/Ratings'
import Analytics from './pages/Analytics'
import Referral from './pages/Referral'
import Schedule from './pages/Schedule'
import FinanceApp from './pages/FinanceApp'
import { supabase } from './lib/supabase'

function TeacherStudents({ user }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(function() {
    if (!user.altegio_staff_id) { setLoading(false); return }
    var now = new Date()
    var start = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01'
    var end = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-31'
    fetch('/api/altegio?action=records&date_from=' + start + '&date_to=' + end).then(function(r){return r.json()}).then(function(d) {
      if (d.ok && d.records) {
        var recs = d.records.filter(function(r){return r.staff_id === user.altegio_staff_id})
        var map = {}
        recs.forEach(function(r) {
          if (r.client) {
            var n = r.client.display_name
            if (!map[n]) map[n] = {name:n, phone:r.client.phone, visits:0, missed:0}
            if (r.attendance === 1) map[n].visits++
            if (r.attendance === -1) map[n].missed++
          }
        })
        setStudents(Object.values(map).sort(function(a,b){return b.visits-a.visits}))
      }
      setLoading(false)
    }).catch(function(){setLoading(false)})
  }, [])

  return (
    <div className="page">
      <div className="section-title">Мои ученики ({students.length})</div>
      {!user.altegio_staff_id && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Аккаунт не привязан к Altegio</div>}
      {loading && user.altegio_staff_id && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}
      {!loading && user.altegio_staff_id && students.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет учеников за этот месяц</div>}
      {students.map(function(s,i) {
        return (
          <div className="card" key={i} style={{display:'flex',alignItems:'center',gap:12}}>
            <div className="avatar">{s.name[0]}</div>
            <div style={{flex:1}}><div className="lesson-name">{s.name}</div><div className="lesson-sub">{s.phone?'+'+s.phone:''}</div></div>
            <div style={{textAlign:'right'}}><div style={{fontSize:14,fontWeight:700,color:'var(--green)'}}>{s.visits}</div><div style={{fontSize:10,color:'var(--text3)'}}>уроков</div></div>
            {s.missed>0&&<div style={{textAlign:'right'}}><div style={{fontSize:14,fontWeight:700,color:'var(--red)'}}>{s.missed}</div><div style={{fontSize:10,color:'var(--text3)'}}>пропуск</div></div>}
          </div>
        )
      })}
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('home')
  const [markOpen, setMarkOpen] = useState(false)
  const [trialSent, setTrialSent] = useState(false)

  function handleLogin(u) {
    setUser(u)
    // Устанавливаем начальную страницу по роли
    var r = (u.role || '').trim().toLowerCase()
    if (r === 'admin') setCurrentPage('schedule')
    else if (r === 'finance') setCurrentPage('home')
    else if (r === 'teacher') setCurrentPage('home')
    else setCurrentPage('home')
  }

  if (!user) return <Login onLogin={handleLogin} />

  // Нормализуем роль (на случай пробелов, регистра)
  var role = (user.role || '').trim().toLowerCase()

  if (role === 'pending') {
    return (
      <div className="login-page">
        <div className="login-logo">🎵</div><h1>Сцена</h1>
        <p style={{marginBottom:24,color:'var(--text2)'}}>Музыкальная школа</p>
        {!trialSent ? (
          <div style={{width:'100%',maxWidth:320}}>
            <div className="card" style={{textAlign:'center',marginBottom:16}}>
              <div style={{fontSize:32,marginBottom:8}}>🎸🥁🎹🎤</div>
              <div style={{fontSize:18,fontWeight:700,color:'var(--gold)',marginBottom:8}}>ЗАПИШИТЕСЬ НА БЕСПЛАТНЫЙ УРОК</div>
              <div style={{fontSize:13,color:'var(--text2)'}}>Попробуйте любой инструмент бесплатно!</div>
            </div>
            <button className="btn btn-primary" style={{fontSize:16,padding:16}} onClick={function(){
              fetch('/api/webhook?action=notify&chat_id=672402&text=' + encodeURIComponent('🎵 Заявка!\n👤 '+user.full_name+'\n📱 '+user.phone+'\n💬 @'+(user.username||'-')))
              setTrialSent(true)
            }}>🎵 Записаться бесплатно</button>
            <p style={{marginTop:16,fontSize:12,color:'var(--text3)',textAlign:'center'}}>Администратор подтвердит ваш аккаунт</p>
          </div>
        ) : (
          <div style={{textAlign:'center',maxWidth:320}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--green)',marginBottom:8}}>Заявка отправлена!</div>
            <div style={{fontSize:14,color:'var(--text2)'}}>Мы свяжемся с вами в ближайшее время</div>
          </div>
        )}
      </div>
    )
  }

  if (role === 'rejected') return <div className="login-page"><div className="login-logo">🎵</div><h1>Сцена</h1><p style={{color:'var(--text2)'}}>Ваша заявка не одобрена.</p></div>

  // ═══ РЕНДЕР СТРАНИЦЫ ═══
  function renderPage() {
    // ФИНАНСИСТ — проверяем ПЕРВЫМ чтобы не попал в другие ветки
    if (role === 'finance') {
      return <FinanceApp page={currentPage} user={user} />
    }
    // АДМИН
    if (role === 'admin') {
      if (currentPage === 'schedule') return <Schedule />
      if (currentPage === 'approve') return <Approve />
      if (currentPage === 'analytics') return <Analytics />
      if (currentPage === 'ratings') return <Ratings />
      if (currentPage === 'finance_tab') return <FinanceApp page="home" user={user} />
      return <Admin page={currentPage} />
    }
    // ПЕДАГОГ
    if (role === 'teacher') {
      if (markOpen) return <MarkLesson user={user} onBack={function(){setMarkOpen(false)}} />
      if (currentPage === 'home') return (<div><TeacherHome user={user} /><div style={{padding:'0 16px 16px'}}><button className="btn btn-primary" onClick={function(){setMarkOpen(true)}}>Отметить урок</button></div></div>)
      if (currentPage === 'salary') return <Salary user={user} />
      if (currentPage === 'students') return <TeacherStudents user={user} />
      return <TeacherHome user={user} />
    }
    // УЧЕНИК (по умолчанию)
    if (currentPage === 'home') return <StudentHome user={user} />
    if (currentPage === 'progress') return <Progress user={user} />
    if (currentPage === 'referral') return <Referral user={user} />
    return <StudentHome user={user} />
  }

  return (
    <div className="app">
      {renderPage()}
      {!markOpen && <BottomNav currentPage={currentPage} onNavigate={function(p){setCurrentPage(p);setMarkOpen(false)}} role={role} />}
    </div>
  )
}

export default App

