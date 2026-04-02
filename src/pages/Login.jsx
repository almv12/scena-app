import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(true)
  const [showReg, setShowReg] = useState(false)
  const [phone, setPhone] = useState('+998')
  const [tgData, setTgData] = useState(null)

  useEffect(function() {
    var tg = window.Telegram && window.Telegram.WebApp
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      tg.ready()
      tg.expand()
      var u = tg.initDataUnsafe.user
      var name = ((u.first_name || '') + ' ' + (u.last_name || '')).trim()
      setTgData({ telegramId: u.id, fullName: name, username: u.username || '-', photo: u.photo_url || null })
      supabase.from('users').select('*').eq('telegram_id', u.id).single().then(function(r) {
        if (r.data) { onLogin(r.data) } else { setShowReg(true); setLoading(false) }
      })
    } else { setLoading(false) }
  }, [])

  function doReg() {
    if (phone.length < 13) return
    supabase.from('users').insert({ telegram_id: tgData.telegramId, full_name: tgData.fullName, phone: phone, role: 'student', avatar_url: tgData.photo, username: tgData.username }).select().single().then(function(r) {
      if (r.data) { onLogin(r.data) } else { alert(JSON.stringify(r.error)) }
    })
  }

  if (loading && !showReg) {
    return (<div className="login-page"><div className="login-logo">🎵</div><h1>Сцена</h1><p>Загрузка...</p></div>)
  }

  if (showReg) {
    return (
      <div className="login-page">
        <div className="login-logo">🎵</div>
        <h1>Добро пожаловать!</h1>
        <p>{tgData.fullName}, введите номер</p>
        <input type="tel" value={phone} onChange={function(e){setPhone(e.target.value)}} style={{width:'100%',padding:14,borderRadius:12,border:'1px solid #f0f0f0',fontSize:16,textAlign:'center',marginBottom:12}} />
        <button className="btn btn-primary" onClick={doReg}>Продолжить</button>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-logo">🎵</div>
      <h1>Сцена</h1>
      <p>Музыкальная школа</p>
      <button className="btn btn-primary" onClick={function(){onLogin({id:'d1',telegram_id:0,full_name:'Азиз Н.',role:'student'})}} style={{marginBottom:12}}>Войти как ученик</button>
      <button className="btn btn-secondary" onClick={function(){onLogin({id:'d2',telegram_id:0,full_name:'Дмитрий Ким',role:'teacher'})}}>Войти как педагог</button>
    </div>
  )
}
