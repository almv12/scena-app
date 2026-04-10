import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Referral({ user }) {
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  var link = 'https://t.me/Scena_app_bot?start=ref_' + user.telegram_id

  useEffect(function() {
    supabase.from('referrals').select('*').eq('referrer_telegram_id', user.telegram_id).order('created_at', { ascending: false }).then(function(r) {
      if (r.data) setReferrals(r.data)
      setLoading(false)
    })
  }, [])

  function copyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link)
    } else {
      var input = document.createElement('input')
      input.value = link
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(function() { setCopied(false) }, 2000)
  }

  function shareLink() {
    var text = '🎵 Приходи учиться музыке в Сцену! Запишись на бесплатный урок по моей ссылке и мы оба получим бонус! 🎁\n\n' + link
    var tg = window.Telegram && window.Telegram.WebApp
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('🎵 Приходи в Сцену! Бесплатный пробный урок + бонус для нас обоих! 🎁'))
    } else {
      window.open('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('🎵 Приходи в Сцену! Бесплатный пробный урок + бонус! 🎁'))
    }
  }

  var converted = referrals.filter(function(r) { return r.status === 'converted' || r.status === 'rewarded' }).length
  var pending = referrals.filter(function(r) { return r.status === 'pending' }).length

  return (
    <div className="page">
      <div className="greeting"><h1>Приведи друга</h1><p>Получите бонусы вместе!</p></div>

      <div className="card" style={{textAlign:'center',background:'linear-gradient(135deg, var(--gold-light), var(--blue-light))'}}>
        <div style={{fontSize:40,marginBottom:8}}>🎁</div>
        <div style={{fontSize:16,fontWeight:700,color:'var(--gold)',marginBottom:4}}>Бесплатный урок за каждого друга!</div>
        <div style={{fontSize:13,color:'var(--text2)'}}>Поделитесь ссылкой — когда друг запишется на урок, вы оба получите бонус</div>
      </div>

      <div className="card">
        <div style={{fontSize:13,color:'var(--text2)',marginBottom:6}}>Ваша ссылка:</div>
        <div style={{background:'var(--bg3)',padding:10,borderRadius:10,fontSize:12,wordBreak:'break-all',color:'var(--blue)',marginBottom:10}}>{link}</div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-primary" style={{flex:1,padding:12}} onClick={shareLink}>📤 Поделиться</button>
          <button className="btn btn-secondary" style={{flex:1,padding:12}} onClick={copyLink}>{copied ? '✅ Скопировано' : '📋 Копировать'}</button>
        </div>
      </div>

      <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
        <div><div style={{fontSize:20,fontWeight:700}}>{referrals.length}</div><div style={{fontSize:11,color:'var(--text2)'}}>Перешли</div></div>
        <div><div style={{fontSize:20,fontWeight:700,color:'var(--green)'}}>{converted}</div><div style={{fontSize:11,color:'var(--text2)'}}>Записались</div></div>
        <div><div style={{fontSize:20,fontWeight:700,color:'var(--gold)'}}>{user.referral_bonus || 0}</div><div style={{fontSize:11,color:'var(--text2)'}}>Бонусов</div></div>
      </div>

      {referrals.length > 0 && <div className="section-title">Приглашённые друзья</div>}
      {referrals.map(function(r) {
        var st = r.status === 'rewarded' ? {text:'Бонус начислен',color:'var(--green)'} : r.status === 'converted' ? {text:'Записался',color:'var(--blue)'} : {text:'Перешёл',color:'var(--gold)'}
        return (
          <div className="card" key={r.id} style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="avatar" style={{background:'var(--blue-light)',color:'var(--blue)'}}>👤</div>
            <div style={{flex:1}}>
              <div className="lesson-sub">{new Date(r.created_at).toLocaleDateString('ru')}</div>
            </div>
            <span style={{fontSize:11,fontWeight:600,color:st.color}}>{st.text}</span>
          </div>
        )
      })}
    </div>
  )
}
