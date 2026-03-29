export default function Login({ onLogin }) {
  // In production this will use Telegram WebApp data
  // For now, demo buttons to test both roles

  function loginAsStudent() {
    onLogin({
      id: 'demo-student-id',
      telegram_id: 123456789,
      full_name: 'Азиз Н.',
      role: 'student',
    })
  }

  function loginAsTeacher() {
    onLogin({
      id: 'demo-teacher-id',
      telegram_id: 987654321,
      full_name: 'Дмитрий Ким',
      role: 'teacher',
    })
  }

  return (
    <div className="login-page">
      <div className="login-logo">🎵</div>
      <h1>Сцена</h1>
      <p>Музыкальная школа<br />Расписание, оплата, прогресс — всё в одном месте</p>

      <button className="btn btn-primary" onClick={loginAsStudent} style={{ marginBottom: 12 }}>
        Войти как ученик (демо)
      </button>

      <button className="btn btn-secondary" onClick={loginAsTeacher}>
        Войти как педагог (демо)
      </button>

      <p style={{ marginTop: 24, fontSize: 12, color: '#aaa' }}>
        В финальной версии вход будет<br />автоматический через Telegram
      </p>
    </div>
  )
}
