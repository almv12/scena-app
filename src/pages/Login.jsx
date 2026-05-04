import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(true)
  const [showReg, setShowReg] = useState(false)
  const [phone, setPhone] = useState('+998')
  const [tgData, setTgData] = useState(null)
  const [regLoading, setRegLoading] = useState(false)

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

  async function doReg() {
    if (phone.length < 13) return
    setRegLoading(true)
    var { data, error } = await supabase.from('users').insert({
      telegram_id: tgData.telegramId,
      full_name: tgData.fullName,
      phone: phone,
      role: 'pending',
      avatar_url: tgData.photo,
      username: tgData.username
    }).select().single()
    if (data) {
      fetch('/api/webhook?action=notify&chat_id=672402&text=' + encodeURIComponent('🆕 Регистрация!\n👤 '+tgData.fullName+'\n📱 '+phone))
      onLogin(data)
    } else { alert(JSON.stringify(error)) }
    setRegLoading(false)
  }

  if (loading && !showReg) return (<div className="login-page"><div className="login-logo">🎵</div><h1>Сцена</h1><p>Загрузка...</p></div>)

  if (showReg) {
    return (
      <div className="login-page">
        <div className="login-logo">🎵</div>
        <h1>Добро пожаловать!</h1>
        <p>{tgData.fullName}, введите номер телефона</p>
        <input type="tel" value={phone} onChange={function(e){setPhone(e.target.value)}} style={{width:'100%',padding:14,borderRadius:14,border:'1px solid var(--border)',fontSize:16,textAlign:'center',marginBottom:12,background:'var(--bg2)',color:'var(--text)',fontFamily:'inherit'}} />
        <button className="btn btn-primary" onClick={doReg} disabled={regLoading}>{regLoading ? '...' : 'Продолжить'}</button>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-logo">🎵</div>
      <h1>Сцена</h1>
      <p>Музыкальная школа</p>
      <p style={{fontSize:11,color:'var(--text3)',marginBottom:12}}>Демо-режим (откройте через @Scena_app_bot для полного доступа)</p>
      <button className="btn btn-primary" onClick={function(){onLogin({id:'d1',telegram_id:0,full_name:'Демо Ученик',role:'student'})}} style={{marginBottom:8}}>Войти как ученик</button>
      <button className="btn btn-secondary" onClick={function(){onLogin({id:'d2',telegram_id:0,full_name:'Демо Педагог',role:'teacher'})}} style={{marginBottom:8}}>Войти как педагог</button>
      <button className="btn btn-secondary" onClick={function(){onLogin({id:'d3',telegram_id:0,full_name:'Admin',role:'admin'})}} style={{marginBottom:8}}>Войти как админ</button>
      <button className="btn btn-secondary" style={{background:'var(--gold)',color:'#fff',border:'none'}} onClick={function(){onLogin({id:'d4',telegram_id:0,full_name:'Демо Финансист',role:'finance'})}}>Войти как финансист 💰</button>
    </div>
  )
}
