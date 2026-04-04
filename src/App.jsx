import { useState } from 'react'
import './App.css'
import Login from './pages/Login'
import StudentHome from './pages/StudentHome'
import TeacherHome from './pages/TeacherHome'
import BottomNav from './components/BottomNav'
import Salary from './pages/Salary'
import MarkLesson from './pages/MarkLesson'

function App() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('home')
  const [markLessonOpen, setMarkLessonOpen] = useState(false)

  if (!user) {
    return <Login onLogin={function(u) { setUser(u); setCurrentPage('home') }} />
  }

  function renderPage() {
    if (user.role === 'teacher') {
      if (markLessonOpen) {
        return <MarkLesson user={user} onBack={function() { setMarkLessonOpen(false) }} />
      }
      switch (currentPage) {
        case 'home':
          return (
            <div>
              <TeacherHome user={user} />
              <div style={{ padding: '0 16px 16px' }}>
                <button className="btn btn-primary" onClick={function() { setMarkLessonOpen(true) }}>Отметить урок</button>
              </div>
            </div>
          )
        case 'students':
          return (
            <div className="page">
              <div className="section-title">Мои ученики (12)</div>
              {['Азиз Н.', 'Марк Ли', 'Алина К.', 'Тимур Р.'].map(function(name, i) {
                return (
                  <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar" style={{ background: ['#E6F1FB','#E1F5EE','#FBEAF0','#FAEEDA'][i], color: ['#0C447C','#085041','#72243E','#633806'][i] }}>
                      {name.split(' ').map(function(w) { return w[0] }).join('')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="lesson-name">{name}</div>
                      <div className="lesson-sub">Гитара · {[12,24,8,3][i]} уроков</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        case 'salary':
          return <Salary user={user} />
        default:
          return <TeacherHome user={user} />
      }
    }

    switch (currentPage) {
      case 'home':
        return <StudentHome user={user} onNavigate={setCurrentPage} />
      case 'schedule':
        return (
          <div className="page">
            <div className="breadcrumb">
              <button onClick={function() { setCurrentPage('home') }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg></button>
              <span>Расписание</span>
            </div>
            <div className="section-title">Сегодня</div>
            <div className="card"><div className="lesson"><div><div className="lesson-time">15:00</div></div><div className="lesson-divider" /><div className="lesson-info"><div className="lesson-name">Гитара</div><div className="lesson-sub">Дмитрий Ким</div></div><span className="badge badge-upcoming">Записан</span></div></div>
          </div>
        )
      case 'pay':
        return (
          <div className="page">
            <div className="breadcrumb">
              <button onClick={function() { setCurrentPage('home') }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg></button>
              <span>Оплата</span>
            </div>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Остаток уроков</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>4 <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 400 }}>из 8</span></div>
              </div>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>Пополнить</button>
            </div>
          </div>
        )
      case 'progress':
        return (
          <div className="page">
            <div className="breadcrumb">
              <button onClick={function() { setCurrentPage('home') }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg></button>
              <span>Прогресс</span>
            </div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span className="lesson-name">Гитара</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>12 уроков</span></div>
              <div className="progress-bar" style={{ width: '100%', height: 6 }}><div className="progress-fill" style={{ width: '65%' }} /></div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Начинающий+</div>
            </div>
          </div>
        )
      default:
        return <StudentHome user={user} onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="app">
      {renderPage()}
      {!markLessonOpen && <BottomNav currentPage={currentPage} onNavigate={function(p) { setCurrentPage(p); setMarkLessonOpen(false) }} role={user.role} />}
    </div>
  )
}

export default App
