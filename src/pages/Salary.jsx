import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Salary({ user }) {
  const [lessons, setLessons] = useState([])
  const [checkins, setCheckins] = useState([])
  const [rates, setRates] = useState(null)
  const [payments, setPayments] = useState([])
  const [tab, setTab] = useState('salary')
  const [loading, setLoading] = useState(true)

  var now = new Date()
  var month = now.getMonth() + 1
  var year = now.getFullYear()
  var monthNames = ['','Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  var startDate = year + '-' + String(month).padStart(2,'0') + '-01'
  var endDate = year + '-' + String(month).padStart(2,'0') + '-31'

  useEffect(function() { loadData() }, [])

  async function loadData() {
    var { data: l } = await supabase.from('conducted_lessons').select('*').eq('teacher_id', user.id).gte('lesson_date', startDate).lte('lesson_date', endDate).order('lesson_date', { ascending: false })
    if (l) setLessons(l)

    var { data: c } = await supabase.from('checkins').select('*').eq('teacher_id', user.id).gte('check_in_at', startDate).order('check_in_at', { ascending: false })
    if (c) setCheckins(c)

    var { data: r } = await supabase.from('teacher_rates').select('*').eq('teacher_id', user.id).single()
    if (r) setRates(r)

    var { data: p } = await supabase.from('payments').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false })
    if (p) setPayments(p)
    setLoading(false)
  }

  var approved = lessons.filter(function(l) { return l.status === 'approved' })
  var pending = lessons.filter(function(l) { return l.status === 'pending' })
  var indiv = approved.filter(function(l) { return l.lesson_type === 'individual' }).length
  var group = approved.filter(function(l) { return l.lesson_type === 'group' }).length

  var totalHours = 0
  checkins.forEach(function(c) { if (c.total_minutes) totalHours += c.total_minutes })
  totalHours = Math.round(totalHours / 60 * 10) / 10

  var indivRate = rates ? rates.individual_rate : 0
  var groupRate = rates ? rates.group_rate : 0
  var totalSalary = (indiv * indivRate) + (group * groupRate)

  var statusLabels = { pending: 'На проверке', approved: 'Подтверждён', rejected: 'Отклонён' }
  var statusStyles = { pending: { bg: 'var(--gold-light)', color: 'var(--gold)' }, approved: { bg: 'var(--green-light)', color: 'var(--green)' }, rejected: { bg: 'var(--red-light)', color: 'var(--red)' } }
  var attLabels = { present: 'Был', late: 'Опоздал', absent: 'Не пришёл', cancelled: 'Отменён' }

  return (
    <div className="page">
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <button className={'btn ' + (tab==='salary'?'btn-primary':'btn-secondary')} style={{flex:1,padding:10}} onClick={function(){setTab('salary')}}>Зарплата</button>
        <button className={'btn ' + (tab==='history'?'btn-primary':'btn-secondary')} style={{flex:1,padding:10}} onClick={function(){setTab('history')}}>Уроки</button>
        <button className={'btn ' + (tab==='payments'?'btn-primary':'btn-secondary')} style={{flex:1,padding:10}} onClick={function(){setTab('payments')}}>Выплаты</button>
      </div>

      {tab === 'salary' && (
        <div>
          <div className="section-title">{monthNames[month]} {year}</div>
          <div className="card">
            <div className="salary-row"><span className="salary-label">Индивидуальных (подтв.)</span><span className="salary-value">{indiv} × {indivRate.toLocaleString()}</span></div>
            <div className="salary-row"><span className="salary-label">Групповых (подтв.)</span><span className="salary-value">{group} × {groupRate.toLocaleString()}</span></div>
            <div className="salary-row"><span className="salary-label">На проверке</span><span className="salary-value" style={{color:'var(--gold)'}}>{pending.length}</span></div>
            <div className="salary-row"><span className="salary-label">Отработано часов</span><span className="salary-value">{totalHours} ч</span></div>
            <div className="salary-row salary-total"><span className="salary-label">Итого к выплате</span><span className="salary-value">{totalSalary.toLocaleString()} сум</span></div>
          </div>
          {!rates && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Ставки не установлены</div>}
          <div className="section-title">Check-in</div>
          {checkins.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет записей</div>}
          {checkins.map(function(c) {
            var d = new Date(c.check_in_at)
            var mins = c.total_minutes || 0
            return (
              <div className="card" key={c.id}>
                <div style={{display:'flex',justifyContent:'space-between'}}><div className="lesson-name">{d.toLocaleDateString('ru')}</div><span className="badge badge-done">{Math.floor(mins/60)}ч {mins%60}м</span></div>
                <div className="lesson-sub">{c.branch_name} · {d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})} — {c.check_out_at ? new Date(c.check_out_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}) : 'на смене'}</div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div className="section-title">Уроки за {monthNames[month]} ({lessons.length})</div>
          {lessons.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет уроков</div>}
          {lessons.map(function(l) {
            var st = statusStyles[l.status] || statusStyles.pending
            return (
              <div className="card" key={l.id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div className="lesson-name">{l.student_name}</div>
                  <span style={{fontSize:10,padding:'3px 6px',borderRadius:8,background:st.bg,color:st.color,fontWeight:600}}>{statusLabels[l.status]}</span>
                </div>
                <div className="lesson-sub">{l.lesson_date} · {l.lesson_time || ''} · {l.instrument || ''} · {l.lesson_type === 'group' ? 'Групп.' : 'Индив.'}</div>
                {l.attendance !== 'present' && <div style={{fontSize:12,color:'var(--red)',marginTop:4}}>{attLabels[l.attendance]}{l.late_minutes > 0 ? ' ' + l.late_minutes + ' мин' : ''}</div>}
                {l.note && <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>{l.note}</div>}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'payments' && (
        <div>
          <div className="section-title">Выплаты</div>
          {payments.length === 0 && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Выплат пока нет</div>}
          {payments.map(function(p) {
            return (
              <div className="card" key={p.id}>
                <div style={{display:'flex',justifyContent:'space-between'}}><div className="lesson-name">{monthNames[p.period_month]} {p.period_year}</div><span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:p.status==='paid'?'var(--green-light)':'var(--gold-light)',color:p.status==='paid'?'var(--green)':'var(--gold)',fontWeight:600}}>{p.status==='paid'?'Выплачено':'Ожидает'}</span></div>
                <div style={{fontSize:18,fontWeight:700,marginTop:4}}>{p.amount.toLocaleString()} сум</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
