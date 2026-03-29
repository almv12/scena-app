import { useState } from 'react'
import './App.css'
import Login from './pages/Login'
import StudentHome from './pages/StudentHome'
import TeacherHome from './pages/TeacherHome'
import BottomNav from './components/BottomNav'

function App() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('home')

  // Not logged in — show login
  if (!user) {
    return <Login onLogin={(u) => { setUser(u); setCurrentPage('home') }} />
  }

  // Render current page based on role
  function renderPage() {
    if (user.role === 'teacher') {
      switch (currentPage) {
        case 'home':
          return <TeacherHome user={user} />
        case 'students':
          return (
            <div className="page">
              <div className="section-title">Мои ученики (12)</div>
              {['Азиз Н.', 'Марк Ли', 'Алина К.', 'Тимур Р.'].map((name, i) => (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar" style={{
                    background: ['#E6F1FB', '#E1F5EE', '#FBEAF0', '#FAEEDA'][i],
                    color: ['#0C447C', '#085041', '#72243E', '#633806'][i]
                  }}>
                    {name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="lesson-name">{name}</div>
                    <div className="lesson-sub">Гитара · {[12, 24, 8, 3][i]} уроков</div>
                  </div>
                </div>
              ))}
            </div>
          )
        case 'salary':
          return (
            <div className="page">
              <div className="section-title">Зарплата — Март 2026</div>
              <div className="card">
                <div className="salary-row"><span className="salary-label">Отработано часов</span><span className="salary-value">84 ч</span></div>
                <div className="salary-row"><span className="salary-label">Проведено уроков</span><span className="salary-value">62</span></div>
                <div className="salary-row"><span className="salary-label">Индивидуальные</span><span className="salary-value">48 × 45 000</span></div>
                <div className="salary-row"><span className="salary-label">Групповые</span><span className="salary-value">14 × 60 000</span></div>
                <div className="salary-row salary-total">
                  <span className="salary-label" style={{ fontWeight: 600, color: 'var(--text)' }}>Итого</span>
                  <span className="salary-value" style={{ fontSize: 20 }}>3 000 000 сум</span>
                </div>
              </div>
              <div className="section-title" style={{ marginTop: 8 }}>Check-in журнал</div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="lesson-name">29 марта, суббота</div>
                  <span className="badge badge-done">5ч 15м</span>
                </div>
                <div className="lesson-sub">13:55 — 19:10</div>
              </div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="lesson-name">28 марта, пятница</div>
                  <span className="badge badge-done">6ч 15м</span>
                </div>
                <div className="lesson-sub">13:50 — 20:05</div>
              </div>
            </div>
          )
        default:
          return <TeacherHome user={user} />
      }
    }

    // Student pages
    switch (currentPage) {
      case 'home':
        return <StudentHome user={user} onNavigate={setCurrentPage} />
      case 'schedule':
        return (
          <div className="page">
            <div className="breadcrumb">
              <button onClick={() => setCurrentPage('home')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span>Расписание</span>
            </div>
            <div className="section-title">29 марта, суббота</div>
            <div className="card card-click">
              <div className="lesson">
                <div><div className="lesson-time">15:00</div></div>
                <div className="lesson-divider" />
                <div className="lesson-info"><div className="lesson-name">Гитара</div><div className="lesson-sub">Дмитрий Ким · Каб. 3</div></div>
                <span className="badge badge-upcoming">Через 2ч</span>
              </div>
            </div>
            <div className="section-title">1 апреля, вторник</div>
            <div className="card">
              <div className="lesson">
                <div><div className="lesson-time">17:00</div></div>
                <div className="lesson-divider" />
                <div className="lesson-info"><div className="lesson-name">Вокал (групп.)</div><div className="lesson-sub">Лола Р. · Зал</div></div>
                <span className="badge badge-upcoming">Записан</span>
              </div>
            </div>
          </div>
        )
      case 'pay':
        return (
          <div className="page">
            <div className="breadcrumb">
              <button onClick={() => setCurrentPage('home')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span>Оплата</span>
            </div>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Остаток уроков</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>4 <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 400 }}>из 8</span></div>
              </div>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>Пополнить</button>
            </div>
            <div className="section-title">История</div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="lesson-name">Абонемент 8 уроков</div>
                <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 14 }}>800 000</span>
              </div>
              <div className="lesson-sub">Click · 25 марта 2026</div>
            </div>
          </div>
        )
      case 'progress':
        return (
          <div className="page">
            <div className="breadcrumb">
              <button onClick={() => setCurrentPage('home')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span>Мой прогресс</span>
            </div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="lesson-name">Гитара</span>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>12 уроков</span>
              </div>
              <div className="progress-bar" style={{ width: '100%', height: 6 }}>
                <div className="progress-fill" style={{ width: '65%' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Уровень: Начинающий+ · Аккорды, бой, перебор</div>
            </div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="lesson-name">Вокал</span>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>6 уроков</span>
              </div>
              <div className="progress-bar" style={{ width: '100%', height: 6 }}>
                <div className="progress-fill" style={{ width: '35%' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Уровень: Начинающий · Дыхание, интонация</div>
            </div>
            <div className="section-title">Последние заметки</div>
            <div className="card">
              <div className="lesson-sub">28 марта · Гитара</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Переходы Am-G стали чище. Следующий шаг — бой с приглушением.</div>
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
      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} role={user.role} />
    </div>
  )
}

export default App
