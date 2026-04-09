export default function BottomNav({ currentPage, onNavigate, role }) {
  var studentTabs = [
    { id: 'home', label: '🏠 Главная' },
    { id: 'progress', label: '📊 Прогресс' },
    { id: 'pay', label: '💰 Оплата' }
  ]

  var teacherTabs = [
    { id: 'home', label: '🏠 Главная' },
    { id: 'students', label: '👥 Ученики' },
    { id: 'salary', label: '💰 Зарплата' }
  ]

  var adminTabs = [
    { id: 'home', label: '📋 Уроки' },
    { id: 'approve', label: '✅ Проверка' },
    { id: 'ratings', label: '⭐ Отзывы' },
    { id: 'users', label: '👥 Юзеры' }
  ]

  var tabs = role === 'admin' ? adminTabs : role === 'teacher' ? teacherTabs : studentTabs

  return (
    <div className="bottom-nav">
      {tabs.map(function(tab) {
        return (
          <button key={tab.id} className={'nav-item' + (currentPage === tab.id ? ' active' : '')} onClick={function() { onNavigate(tab.id) }}>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
