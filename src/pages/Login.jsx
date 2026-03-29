import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        var fullName = (tgUser.first_name || '') + ' ' + (tgUser.last_name || '')
        fullName = fullName.trim()

        var { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', telegramId)
          .single()

        if (existingUser) {
          onLogin(existingUser)
          return
        }

        var { data: newUser } = await supabase
          .from('users')
          .insert({
            telegram_id: telegramId,
            full_name: fullName,
            role: 'student',
            avatar_url: tgUser.photo_url || null
          })
          .select()
          .single()

        if (newUser) {
          onLogin(newUser)
          return
        }
      }
    } catch (e) {
      console.log('Telegram auth error:', e)
    }
    setLoading(false)
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
        Откройте через Telegram для<br />автоматического входа
      </p>
    </div>
  )
}
