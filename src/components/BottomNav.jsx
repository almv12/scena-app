export default function BottomNav({ currentPage, onNavigate, role }) {
  var studentTabs = [
    { id: 'home', label: '🏠', sub: 'Главная' },
    { id: 'progress', label: '📊', sub: 'Прогресс' },
    { id: 'pay', label: '💰', sub: 'Оплата' }
  ]

  var teacherTabs = [
    { id: 'home', label: '🏠', sub: 'Главная' },
    { id: 'students', label: '👥', sub: 'Ученики' },
    { id: 'salary', label: '💰', sub: 'Зарплата' }
  ]

  var adminTabs = [
    { id: 'home', label: '📋', sub: 'Уроки' },
    { id: 'approve', label: '✅', sub: 'Проверка' },
    { id: 'ratings', label: '⭐', sub: 'Отзывы' },
    { id: 'notify', label: '📢', sub: 'Рассылка' },
    { id: 'users', label: '👥', sub: 'Юзеры' }
  ]

  var tabs = role === 'admin' ? adminTabs : role === 'teacher' ? teacherTabs : studentTabs

  return (
    <div className="bottom-nav">
      {tabs.map(function(tab) {
        return (
          <button key={tab.id} className={'nav-item' + (currentPage === tab.id ? ' active' : '')} onClick={function() { onNavigate(tab.id) }}>
            <span style={{fontSize:20,display:'block'}}>{tab.label}</span>
            <span style={{fontSize:10,display:'block',marginTop:2}}>{tab.sub}</span>
          </button>
        )
      })}
    </div>
  )
}
