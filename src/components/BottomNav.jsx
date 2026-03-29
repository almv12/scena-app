export default function BottomNav({ currentPage, onNavigate, role }) {
  const studentTabs = [
    { id: 'home', label: 'Главная' },
    { id: 'schedule', label: 'Расписание' },
    { id: 'pay', label: 'Оплата' },
    { id: 'progress', label: 'Прогресс' },
  ]

  const teacherTabs = [
    { id: 'home', label: 'Главная' },
    { id: 'students', label: 'Ученики' },
    { id: 'salary', label: 'Зарплата' },
  ]

  const tabs = role === 'teacher' ? teacherTabs : studentTabs

  return (
    <div className="bottom-nav">
      {tabs.map(function(tab) {
        return (
          <button
            key={tab.id}
            className={'nav-item' + (currentPage === tab.id ? ' active' : '')}
            onClick={function() { onNavigate(tab.id) }}
          >
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}