import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Salary({ user }) {
  const [records, setRecords] = useState([])
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
    var r = await fetch('/api/altegio?action=records&date_from=' + startDate + '&date_to=' + endDate)
    var data = await r.json()
    if (data.ok && data.records) {
      var staffId = user.altegio_staff_id
      var filtered = staffId ? data.records.filter(function(rec) { return rec.staff_id === staffId }) : data.records
      setRecords(filtered)
    }

    var { data: c } = await supabase.from('checkins').select('*').eq('teacher_id', user.id).gte('check_in_at', startDate).order('check_in_at', { ascending: false })
    if (c) setCheckins(c)

    var { data: rt } = await supabase.from('teacher_rates').select('*').eq('teacher_id', user.id).single()
    if (rt) setRates(rt)

    var { data: p } = await supabase.from('payments').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false })
    if (p) setPayments(p)

    setLoading(false)
  }

  var attended = records.filter(function(r) { return r.attendance === 1 })
  var missed = records.filter(function(r) { return r.attendance === -1 })
  var totalLessons = attended.length

  var totalHours = 0
  checkins.forEach(function(c) { if (c.total_minutes) totalHours += c.total_minutes })
  totalHours = Math.round(totalHours / 60 * 10) / 10

  var indivRate = rates ? rates.individual_rate : 0
  var groupRate = rates ? rates.group_rate : 0
  var totalRevenue = 0
  attended.forEach(function(r) {
    if (r.services && r.services[0]) totalRevenue += r.services[0].manual_cost || 0
  })
  var totalSalary = totalLessons * indivRate

  function getAttLabel(att) {
    if (att === 1) return { text: 'Был', bg: '#E1F5EE', color: '#1D9E75' }
    if (att === -1) return { text: 'Не пришёл', bg: '#FCEBEB', color: '#A32D2D' }
    return { text: 'Ожидает', bg: '#FAEEDA', color: '#854F0B' }
  }

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
            <div className="salary-row"><span className="salary-label">Проведено уроков</span><span className="salary-value">{totalLessons}</span></div>
            <div className="salary-row"><span className="salary-label">Не пришли</span><span className="salary-value" style={{color:'#A32D2D'}}>{missed.length}</span></div>
            <div className="salary-row"><span className="salary-label">Отработано часов</span><span className="salary-value">{totalHours} ч</span></div>
            <div className="salary-row"><span className="salary-label">Выручка уроков</span><span className="salary-value">{totalRevenue.toLocaleString()} сум</span></div>
            <div className="salary-row"><span className="salary-label">Ставка за урок</span><span className="salary-value">{indivRate.toLocaleString()} сум</span></div>
            <div className="salary-row salary-total">
              <span className="salary-label" style={{fontWeight:600}}>Итого к выплате</span>
              <span className="salary-value" style={{fontSize:20}}>{totalSalary.toLocaleString()} сум</span>
            </div>
          </div>
          {!rates && <div className="card" style={{textAlign:'center',color:'#888',fontSize:13}}>Ставки не установлены</div>}
          <div className="section-title" style={{marginTop:8}}>Check-in</div>
          {checkins.length === 0 && <div className="card" style={{color:'#888',fontSize:13}}>Нет записей</div>}
          {checkins.map(function(c) {
            var d = new Date(c.check_in_at)
            var mins = c.total_minutes || 0
            return (
              <div className="card" key={c.id}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div className="lesson-name">{d.toLocaleDateString('ru')}</div>
                  <span className="badge badge-done">{Math.floor(mins/60)}ч {mins%60}м</span>
                </div>
                <div className="lesson-sub">{c.branch_name} · {d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div className="section-title">Уроки за {monthNames[month]} ({records.length})</div>
          {loading && <div className="card" style={{color:'#888',fontSize:13}}>Загрузка...</div>}
          {records.map(function(rec) {
            var time = rec.date.slice(11,16)
            var date = rec.date.slice(0,10)
            var client = rec.client ? rec.client.display_name : '—'
            var service = rec.services && rec.services[0] ? rec.services[0].title : ''
            var cost = rec.services && rec.services[0] ? rec.services[0].manual_cost : 0
            var badge = getAttLabel(rec.attendance)
            return (
              <div className="card" key={rec.id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div className="lesson-name" style={{fontSize:13}}>{client}</div>
                  <span style={{fontSize:10,padding:'3px 6px',borderRadius:6,background:badge.bg,color:badge.color,fontWeight:600}}>{badge.text}</span>
                </div>
                <div className="lesson-sub">{date} · {time} · {service} · {cost > 0 ? cost.toLocaleString() + ' сум' : ''}</div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'payments' && (
        <div>
          <div className="section-title">История выплат</div>
          {payments.length === 0 && <div className="card" style={{color:'#888',fontSize:13}}>Выплат пока нет</div>}
          {payments.map(function(p) {
            return (
              <div className="card" key={p.id}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div className="lesson-name">{monthNames[p.period_month]} {p.period_year}</div>
                  <span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:p.status==='paid'?'#E1F5EE':'#FAEEDA',color:p.status==='paid'?'#1D9E75':'#854F0B',fontWeight:600}}>{p.status==='paid'?'Выплачено':'Ожидает'}</span>
                </div>
                <div style={{fontSize:18,fontWeight:600,marginTop:4}}>{p.amount.toLocaleString()} сум</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
