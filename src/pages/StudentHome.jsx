import LessonCard from '../components/LessonCard'

export default function StudentHome({ user, onNavigate }) {
  const firstName = user?.full_name?.split(' ')[0] || 'Ученик'

  return (
    <div className="page">
      <div className="greeting">
        <h1>Привет, {firstName} 👋</h1>
        <p>Следующий урок — гитара через 2 часа</p>
      </div>

      <div className="quick-actions">
        <div className="qa-card" onClick={() => onNavigate('schedule')}>
          <div className="qa-icon" style={{ background: '#E6F1FB' }}>📅</div>
          <div className="qa-label">Расписание</div>
          <div className="qa-sub">3 урока на неделе</div>
        </div>
        <div className="qa-card" onClick={() => onNavigate('pay')}>
          <div className="qa-icon" style={{ background: '#E1F5EE' }}>💳</div>
          <div className="qa-label">Оплата</div>
          <div className="qa-sub">Баланс: 4 урока</div>
        </div>
        <div className="qa-card" onClick={() => onNavigate('progress')}>
          <div className="qa-icon" style={{ background: '#FAEEDA' }}>📈</div>
          <div className="qa-label">Прогресс</div>
          <div className="qa-sub">12 уроков пройдено</div>
        </div>
        <div className="qa-card" onClick={() => onNavigate('community')}>
          <div className="qa-icon" style={{ background: '#EEEDFE' }}>👥</div>
          <div className="qa-label">Сообщество</div>
          <div className="qa-sub">Клуб Сцена</div>
        </div>
      </div>

      <div className="section-title">Ближайшие уроки</div>

      <LessonCard
        time="15:00"
        timeSub="Сегодня"
        name="Гитара (индив.)"
        sub="Дмитрий Ким · Каб. 3"
        badge="Через 2ч"
        badgeType="upcoming"
        progress={65}
      />

      <LessonCard
        time="17:00"
        timeSub="Среда"
        name="Вокал (групп.)"
        sub="Лола Рахимова · Зал"
        badge="2 дня"
        badgeType="upcoming"
        progress={40}
      />

      <LessonCard
        time="11:00"
        timeSub="Суббота"
        name="Фортепиано (индив.)"
        sub="Саида М. · Каб. 5"
        badge="Пробный"
        badgeType="warn"
        progress={20}
      />
    </div>
  )
}

