export default function BottomNav({ currentPage, onNavigate, role }) {
  var studentTabs = [
    { id: 'home', label: '🏠', sub: 'Главная' },
    { id: 'progress', label: '📊', sub: 'Прогресс' },
    { id: 'referral', label: '🎁', sub: 'Друзья' },
    { id: 'pay', label: '💰', sub: 'Оплата' }
  ]

  var teacherTabs = [
    { id: 'home', label: '🏠', sub: 'Главная' },
    { id: 'students', label: '👥', sub: 'Ученики' },
    { id: 'salary', label: '💰', sub: 'Зарплата' }
  ]

  var adminTabs = [
    { id: 'schedule', label: '📅', sub: 'Расписание' },
    { id: 'approve', label: '✅', sub: 'Проверка' },
    { id: 'finance_tab', label: '💰', sub: 'Финансы' },
    { id: 'notify', label: '📢', sub: 'Рассылка' },
    { id: 'users', label: '👥', sub: 'Юзеры' }
  ]

  var financeTabs = [
    { id: 'home', label: '📊', sub: 'P&L' },
    { id: 'income', label: '📈', sub: 'Доходы' },
    { id: 'expenses', label: '📉', sub: 'Расходы' }
  ]

  var tabs = role === 'admin' ? adminTabs : role === 'teacher' ? teacherTabs : role === 'finance' ? financeTabs : studentTabs

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

