import { useState } from 'react'
import './App.css'
import Login from './pages/Login'
import StudentHome from './pages/StudentHome'
import TeacherHome from './pages/TeacherHome'
import BottomNav from './components/BottomNav'
import Salary from './pages/Salary'
import MarkLesson from './pages/MarkLesson'
import Admin from './pages/Admin'

function App() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('home')
  const [markOpen, setMarkOpen] = useState(false)


  if (!user) {
    return <Login onLogin={function(u) { setUser(u); setCurrentPage('home') }} />
  }


  function renderPage() {
    if (user.role === 'admin') { console.log('ADMIN PAGE:', currentPage); return <Admin page={currentPage} /> }

    if (user.role === 'teacher') {
      if (markOpen) return <MarkLesson user={user} onBack={function(){setMarkOpen(false)}} />
      if (currentPage === 'home') return (<div><TeacherHome user={user} /><div style={{padding:'0 16px 16px'}}><button className="btn btn-primary" onClick={function(){setMarkOpen(true)}}>Отметить урок</button></div></div>)
      if (currentPage === 'salary') return <Salary user={user} />
      if (currentPage === 'students') return (<div className="page"><div className="section-title">Мои ученики</div>{['Азиз Н.','Марк Ли','Алина К.','Тимур Р.'].map(function(n,i){return <div key={i} className="card" style={{display:'flex',alignItems:'center',gap:12}}><div className="avatar" style={{background:['#E6F1FB','#E1F5EE','#FBEAF0','#FAEEDA'][i],color:['#0C447C','#085041','#72243E','#633806'][i]}}>{n[0]}</div><div><div className="lesson-name">{n}</div><div className="lesson-sub">Гитара</div></div></div>})}</div>)
      return <TeacherHome user={user} />
    }

    if (currentPage === 'home') return <StudentHome user={user} onNavigate={setCurrentPage} />
    if (currentPage === 'schedule') return (<div className="page"><div className="breadcrumb"><button onClick={function(){setCurrentPage('home')}}>&lt; Назад</button><span>Расписание</span></div><div className="card"><div className="lesson"><div><div className="lesson-time">15:00</div></div><div className="lesson-divider" /><div className="lesson-info"><div className="lesson-name">Гитара</div><div className="lesson-sub">Дмитрий Ким</div></div></div></div></div>)
    if (currentPage === 'pay') return (<div className="page"><div className="breadcrumb"><button onClick={function(){setCurrentPage('home')}}>&lt; Назад</button><span>Оплата</span></div><div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:12,color:'var(--text2)'}}>Остаток</div><div style={{fontSize:24,fontWeight:600}}>4 из 8</div></div><button className="btn btn-primary" style={{width:'auto',padding:'10px 20px'}}>Пополнить</button></div></div>)
    if (currentPage === 'progress') return (<div className="page"><div className="breadcrumb"><button onClick={function(){setCurrentPage('home')}}>&lt; Назад</button><span>Прогресс</span></div><div className="card"><div className="lesson-name">Гитара · 12 уроков</div><div className="progress-bar" style={{width:'100%',height:6}}><div className="progress-fill" style={{width:'65%'}} /></div></div></div>)
    return <StudentHome user={user} onNavigate={setCurrentPage} />
  }

  return (
    <div className="app">
      {renderPage()}
      {!markOpen && <BottomNav currentPage={currentPage} onNavigate={function(p){setCurrentPage(p);setMarkOpen(false)}} role={user.role} />}
    </div>
  )
}

export default App
