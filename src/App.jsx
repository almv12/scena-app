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
        var list = Object.values(map)
        list.sort(function(a,b){return b.visits - a.visits})
        setStudents(list)
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
            <div style={{flex:1}}>
              <div className="lesson-name">{s.name}</div>
              <div className="lesson-sub">{s.phone ? '+'+s.phone : ''}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:14,fontWeight:700,color:'var(--green)'}}>{s.visits}</div>
              <div style={{fontSize:10,color:'var(--text3)'}}>уроков</div>
            </div>
            {s.missed > 0 && <div style={{textAlign:'right'}}>
              <div style={{fontSize:14,fontWeight:700,color:'var(--red)'}}>{s.missed}</div>
              <div style={{fontSize:10,color:'var(--text3)'}}>пропуск</div>
            </div>}
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

  if (!user) {
    return <Login onLogin={function(u) { setUser(u); setCurrentPage('home') }} />
  }

  if (user.role === 'pending') {
    return (
      <div className="login-page">
        <div className="login-logo">🎵</div>
        <h1>Сцена</h1>
        <p style={{marginBottom:24,color:'var(--text2)'}}>Музыкальная школа</p>
        {!trialSent ? (
          <div style={{width:'100%',maxWidth:320}}>
            <div className="card" style={{textAlign:'center',marginBottom:16}}>
              <div style={{fontSize:32,marginBottom:8}}>🎸🥁🎹🎤</div>
              <div style={{fontSize:18,fontWeight:700,color:'var(--gold)',marginBottom:8}}>ЗАПИШИТЕСЬ НА БЕСПЛАТНЫЙ УРОК</div>
              <div style={{fontSize:13,color:'var(--text2)'}}>Попробуйте любой инструмент бесплатно!</div>
            </div>
            <button className="btn btn-primary" style={{fontSize:16,padding:16}} onClick={function(){
              var msg = '🎵 Заявка на бесплатный урок!\n\n👤 ' + user.full_name + '\n📱 ' + user.phone + '\n💬 @' + (user.username||'-') + '\n🆔 TG: ' + user.telegram_id
              fetch('/api/webhook?action=notify&chat_id=672402&text=' + encodeURIComponent(msg))
              setTrialSent(true)
            }}>🎵 Записаться бесплатно</button>
            <p style={{marginTop:16,fontSize:12,color:'var(--text3)',textAlign:'center'}}>Если вы уже ученик — администратор подтвердит ваш аккаунт</p>
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

  if (user.role === 'rejected') {
    return (<div className="login-page"><div className="login-logo">🎵</div><h1>Сцена</h1><p style={{color:'var(--text2)'}}>Ваша заявка не одобрена.</p></div>)
  }

  function renderPage() {
    if (user.role === 'admin') {
      if (currentPage === 'approve') return <Approve />
      return <Admin page={currentPage} />
    }
    if (user.role === 'teacher') {
      if (markOpen) return <MarkLesson user={user} onBack={function(){setMarkOpen(false)}} />
      if (currentPage === 'home') return (<div><TeacherHome user={user} /><div style={{padding:'0 16px 16px'}}><button className="btn btn-primary" onClick={function(){setMarkOpen(true)}}>Отметить урок</button></div></div>)
      if (currentPage === 'salary') return <Salary user={user} />
      if (currentPage === 'students') return <TeacherStudents user={user} />
      return <TeacherHome user={user} />
    }
    if (currentPage === 'home') return <StudentHome user={user} />
    if (currentPage === 'pay') return (<div className="page"><div className="breadcrumb"><button onClick={function(){setCurrentPage('home')}}>← Назад</button><span>Оплата</span></div><div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:12,color:'var(--text2)'}}>Остаток</div><div style={{fontSize:24,fontWeight:700}}>4 из 8</div></div><button className="btn btn-primary" style={{width:'auto',padding:'10px 20px'}}>Пополнить</button></div></div>)
    if (currentPage === 'progress') return (<div className="page"><div className="breadcrumb"><button onClick={function(){setCurrentPage('home')}}>← Назад</button><span>Прогресс</span></div><div className="card"><div className="lesson-name">Данные из Altegio</div><div className="progress-bar" style={{width:'100%',height:6}}><div className="progress-fill" style={{width:'65%'}} /></div></div></div>)
    return <StudentHome user={user} />
  }

  return (
    <div className="app">
      {renderPage()}
      {!markOpen && <BottomNav currentPage={currentPage} onNavigate={function(p){setCurrentPage(p);setMarkOpen(false)}} role={user.role} />}
    </div>
  )
}

export default App
