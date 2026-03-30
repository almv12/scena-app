import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [phone, setPhone] = useState('+998')
  const [tgData, setTgData] = useState(null)

  useEffect(function() {
    tryTelegramLogin()
  }, [])

  async function tryTelegramLogin() {
    try {
      var tg = window.Telegram && window.Telegram.WebApp
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        tg.ready()
        tg.expand()
        var tgUser = tg.initDataUnsafe.user
        var telegramId = tgUser.id
        var fullName = ((tgUser.first_name || '') + ' ' + (tgUser.last_name || '')).trim()
        var username = tgUser.username || ''

        setTgData({ telegramId: telegramId, fullName: fullName, username: username, photo: tgUser.photo_url })

        var { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', telegramId)
          .single()

        if (existingUser) {
          onLogin(existingUser)
          return
        }

        setShowRegister(true)
        setLoading(false)
        return
      }
    } catch (e) {
      console.log('Auth error:', e)
    }
    setLoading(false)
  }

  async function handleRegister() {
    if (phone.length < 13) return

    var { data: newUser } = await supabase
      .from('users')
      .insert({
      telegram_id: tgData.id,
      full_name: tgData.name,
      phone: phone,
      role: 'student',
      avatar_url: tgData.photo || null,
      username: tgData.username || '-'
      })
      .select()
      .single()

    if (newUser) {
      onLogin(newUser)
    }
  }

  function loginAsStudent() {
    onLogin({ id: 'demo-student', telegram_id: 0, full_name: 'Азиз Н.', role: 'student' })
  }

  function loginAsTeacher() {
    onLogin({ id: 'demo-teacher', telegram_id: 0, full_name: 'Дмитрий Ким', role: 'teacher' })
  }

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-logo">🎵</div>
        <h1>Сцена</h1>
        <p>Загрузка...</p>
      </div>
    )
  }

  if (showRegister) {
    return (
      <div className="login-page">
        <div className="login-logo">🎵</div>
        <h1>Добро пожаловать!</h1>
        <p>{tgData.fullName}, для завершения регистрации введите номер телефона</p>
        <input
          type="tel"
          value={phone}
          onChange={function(e) { setPhone(e.target.value) }}
          placeholder="+998 90 123 45 67"
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            border: '1px solid #f0f0f0', fontSize: '16px',
            textAlign: 'center', marginBottom: '12px'
          }}
        />
        <button className="btn btn-primary" onClick={handleRegister}>
          Продолжить
        </button>
        <p style={{ marginTop: 16, fontSize: 12, color: '#aaa' }}>
          Номер нужен для связи с вашим аккаунтом в школе
        </p>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-logo">🎵</div>
      <h1>Сцена</h1>
      <p>Музыкальная школа<br />Расписание, оплата, прогресс</p>
      <button className="btn btn-primary" onClick={loginAsStudent} style={{ marginBottom: 12 }}>
        Войти как ученик (демо)
      </button>
      <button className="btn btn-secondary" onClick={loginAsTeacher}>
        Войти как педагог (демо)
      </button>
      <p style={{ marginTop: 24, fontSize: 12, color: '#aaa' }}>
        Откройте через Telegram для автоматического входа
      </p>
    </div>
  )
}
