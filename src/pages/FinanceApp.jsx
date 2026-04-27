import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

var EXPENSE_CATEGORIES = [
  { id: 'rent', label: 'Аренда', icon: '🏠' },
  { id: 'utilities', label: 'Коммунальные', icon: '💡' },
  { id: 'supplies', label: 'Расходники', icon: '📦' },
  { id: 'marketing', label: 'Маркетинг', icon: '📣' },
  { id: 'salary', label: 'Зарплата (доп)', icon: '💰' },
  { id: 'equipment', label: 'Оборудование', icon: '🎸' },
  { id: 'repairs', label: 'Ремонт', icon: '🔧' },
  { id: 'other', label: 'Другое', icon: '📋' },
]

var PAYMENT_METHODS = [
  { id: 'cash', label: 'Наличные' },
  { id: 'card', label: 'Карта' },
  { id: 'click', label: 'Click' },
  { id: 'payme', label: 'Payme' },
  { id: 'transfer', label: 'Перевод' },
]

export default function FinanceApp({ page, user }) {
  var [incomeList, setIncomeList] = useState([])
  var [expensesList, setExpensesList] = useState([])
  var [students, setStudents] = useState([])
  var [loading, setLoading] = useState(true)
  var [view, setView] = useState(page || 'home') // home | income | expenses | addIncome | addExpense
  var [successMsg, setSuccessMsg] = useState('')

  // Формы
  var [incForm, setIncForm] = useState({ student_id:'', student_name:'', amount:'', payment_method:'cash', package_name:'', lessons_count:'', branch_name:'', notes:'', income_date:'' })
  var [expForm, setExpForm] = useState({ category:'other', description:'', amount:'', branch_name:'', vendor:'', expense_date:'' })

  var userName = user ? user.full_name || 'Неизвестный' : 'Неизвестный'

  useEffect(function() { loadData() }, [])
  useEffect(function() { if (page) setView(page) }, [page])

  async function loadData() {
    setLoading(true)
    var now = new Date()
    var dateFrom = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01'

    var results = await Promise.all([
      supabase.from('income').select('*').gte('income_date', dateFrom).order('income_date', { ascending: false }),
      supabase.from('expenses').select('*').gte('expense_date', dateFrom).order('expense_date', { ascending: false }),
      supabase.from('users').select('id,full_name').eq('role','student').order('full_name'),
    ])
    setIncomeList(results[0].data || [])
    setExpensesList(results[1].data || [])
    setStudents(results[2].data || [])
    setLoading(false)
  }

  // ═══ СОХРАНИТЬ ДОХОД ═══
  async function saveIncome() {
    if (!incForm.amount || parseInt(incForm.amount) <= 0) { alert('Введите сумму'); return }
    var student = students.find(function(s) { return s.id === incForm.student_id })
    var studentName = student ? student.full_name : incForm.student_name || ''

    var { error } = await supabase.from('income').insert({
      student_id: incForm.student_id || null,
      student_name: studentName,
      amount: parseInt(incForm.amount),
      payment_method: incForm.payment_method || 'cash',
      package_name: incForm.package_name || null,
      lessons_count: incForm.lessons_count ? parseInt(incForm.lessons_count) : null,
      branch_name: incForm.branch_name || null,
      notes: incForm.notes || null,
      income_date: incForm.income_date || new Date().toISOString().slice(0,10),
      created_by_name: userName,
      created_by_role: user ? user.role : 'unknown',
    })

    if (error) { alert('Ошибка: ' + error.message); return }

    // Автопополнение баланса
    if (incForm.student_id && incForm.lessons_count && parseInt(incForm.lessons_count) > 0) {
      var { data: stData } = await supabase.from('users').select('lessons_balance').eq('id', incForm.student_id).single()
      if (stData) {
        await supabase.from('users').update({
          lessons_balance: (stData.lessons_balance || 0) + parseInt(incForm.lessons_count),
          subscription_type: incForm.package_name || null,
        }).eq('id', incForm.student_id)
      }
    }

    setSuccessMsg('✅ Оплата ' + parseInt(incForm.amount).toLocaleString() + ' сум добавлена!' + (studentName ? ' (' + studentName + ')' : ''))
    setIncForm({ student_id:'', student_name:'', amount:'', payment_method:'cash', package_name:'', lessons_count:'', branch_name:'', notes:'', income_date:'' })
    loadData()
    setTimeout(function() { setSuccessMsg(''); setView('income') }, 2000)
  }

  // ═══ СОХРАНИТЬ РАСХОД ═══
  async function saveExpense() {
    if (!expForm.amount || parseInt(expForm.amount) <= 0) { alert('Введите сумму'); return }
    if (!expForm.category) { alert('Выберите категорию'); return }

    var { error } = await supabase.from('expenses').insert({
      category: expForm.category,
      description: expForm.description || null,
      amount: parseInt(expForm.amount),
      branch_name: expForm.branch_name || null,
      vendor: expForm.vendor || null,
      expense_date: expForm.expense_date || new Date().toISOString().slice(0,10),
      created_by_name: userName,
      created_by_role: user ? user.role : 'unknown',
    })

    if (error) { alert('Ошибка: ' + error.message); return }

    var catName = EXPENSE_CATEGORIES.find(function(c){return c.id === expForm.category})
    setSuccessMsg('✅ Расход ' + parseInt(expForm.amount).toLocaleString() + ' сум добавлен!' + (catName ? ' (' + catName.label + ')' : ''))
    setExpForm({ category:'other', description:'', amount:'', branch_name:'', vendor:'', expense_date:'' })
    loadData()
    setTimeout(function() { setSuccessMsg(''); setView('expenses') }, 2000)
  }

  var totalIncome = incomeList.reduce(function(s,i) { return s + (i.amount||0) }, 0)
  var totalExpenses = expensesList.reduce(function(s,e) { return s + (e.amount||0) }, 0)
  var profit = totalIncome - totalExpenses

  var catLabel = function(id) { var f = EXPENSE_CATEGORIES.find(function(c){return c.id===id}); return f ? f.icon + ' ' + f.label : id || '📋 Другое' }
  var methodLabel = function(id) { var f = PAYMENT_METHODS.find(function(m){return m.id===id}); return f ? f.label : id || 'Наличные' }

  var inputStyle = { width:'100%', padding:12, borderRadius:12, border:'1px solid var(--border)', fontSize:14, marginBottom:10, background:'var(--bg2)', color:'var(--text)', fontFamily:'inherit' }

  // ═══ СООБЩЕНИЕ ОБ УСПЕХЕ ═══
  if (successMsg) {
    return (
      <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:12}}>🎉</div>
          <div style={{fontSize:18,fontWeight:700,color:'var(--green)',marginBottom:8}}>{successMsg}</div>
          <div style={{fontSize:13,color:'var(--text3)'}}>Загрузка...</div>
        </div>
      </div>
    )
  }

  // ═══ ФОРМА ДОХОДА ═══
  if (view === 'addIncome') {
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setView('income')}}>← Назад</button><span>Добавить оплату</span></div>
        <div className="card">
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Ученик (из системы)</div>
          <select value={incForm.student_id} onChange={function(e){setIncForm(Object.assign({},incForm,{student_id:e.target.value, student_name:''}))}} style={inputStyle}>
            <option value="">— Выберите или введите имя ниже —</option>
            {students.map(function(s) { return <option key={s.id} value={s.id}>{s.full_name}</option> })}
          </select>

          {!incForm.student_id && (
            <div>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Или имя вручную</div>
              <input type="text" value={incForm.student_name} onChange={function(e){setIncForm(Object.assign({},incForm,{student_name:e.target.value}))}} placeholder="Имя (если нет в списке)" style={inputStyle} />
            </div>
          )}

          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Сумма (сум) *</div>
              <input type="number" value={incForm.amount} onChange={function(e){setIncForm(Object.assign({},incForm,{amount:e.target.value}))}} placeholder="400000" style={inputStyle} />
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Способ</div>
              <select value={incForm.payment_method} onChange={function(e){setIncForm(Object.assign({},incForm,{payment_method:e.target.value}))}} style={inputStyle}>
                {PAYMENT_METHODS.map(function(m) { return <option key={m.id} value={m.id}>{m.label}</option> })}
              </select>
            </div>
          </div>

          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Пакет</div>
              <input type="text" value={incForm.package_name} onChange={function(e){setIncForm(Object.assign({},incForm,{package_name:e.target.value}))}} placeholder="8 уроков" style={inputStyle} />
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Кол-во уроков</div>
              <input type="number" value={incForm.lessons_count} onChange={function(e){setIncForm(Object.assign({},incForm,{lessons_count:e.target.value}))}} placeholder="8" style={inputStyle} />
            </div>
          </div>

          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Филиал</div>
              <select value={incForm.branch_name} onChange={function(e){setIncForm(Object.assign({},incForm,{branch_name:e.target.value}))}} style={inputStyle}>
                <option value="">—</option><option value="Ганди 44">Ганди 44</option><option value="Ганди 29">Ганди 29</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Дата</div>
              <input type="date" value={incForm.income_date || new Date().toISOString().slice(0,10)} onChange={function(e){setIncForm(Object.assign({},incForm,{income_date:e.target.value}))}} style={inputStyle} />
            </div>
          </div>

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Заметки</div>
          <input type="text" value={incForm.notes} onChange={function(e){setIncForm(Object.assign({},incForm,{notes:e.target.value}))}} placeholder="Необязательно" style={inputStyle} />

          {incForm.student_id && incForm.lessons_count && <div style={{fontSize:11,color:'var(--green)',fontWeight:600,marginBottom:8}}>✓ Баланс ученика пополнится на {incForm.lessons_count} уроков</div>}
        </div>
        <button className="btn btn-primary" style={{fontSize:16,padding:14}} onClick={saveIncome}>💰 Добавить оплату</button>
      </div>
    )
  }

  // ═══ ФОРМА РАСХОДА ═══
  if (view === 'addExpense') {
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setView('expenses')}}>← Назад</button><span>Добавить расход</span></div>
        <div className="card">
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:6}}>Категория *</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
            {EXPENSE_CATEGORIES.map(function(c) {
              var isActive = expForm.category === c.id
              return <button key={c.id} style={{padding:'8px 14px',borderRadius:10,fontSize:13,fontWeight:600,border:'2px solid '+(isActive?'var(--gold)':'var(--border)'),background:isActive?'var(--gold-light)':'var(--bg2)',color:isActive?'var(--gold)':'var(--text2)',cursor:'pointer',fontFamily:'inherit'}} onClick={function(){setExpForm(Object.assign({},expForm,{category:c.id}))}}>{c.icon} {c.label}</button>
            })}
          </div>

          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Описание</div>
          <input type="text" value={expForm.description} onChange={function(e){setExpForm(Object.assign({},expForm,{description:e.target.value}))}} placeholder="За что платим" style={inputStyle} />

          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Сумма (сум) *</div>
              <input type="number" value={expForm.amount} onChange={function(e){setExpForm(Object.assign({},expForm,{amount:e.target.value}))}} placeholder="500000" style={inputStyle} />
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Дата</div>
              <input type="date" value={expForm.expense_date || new Date().toISOString().slice(0,10)} onChange={function(e){setExpForm(Object.assign({},expForm,{expense_date:e.target.value}))}} style={inputStyle} />
            </div>
          </div>

          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Филиал</div>
              <select value={expForm.branch_name} onChange={function(e){setExpForm(Object.assign({},expForm,{branch_name:e.target.value}))}} style={inputStyle}>
                <option value="">—</option><option value="Ганди 44">Ганди 44</option><option value="Ганди 29">Ганди 29</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Поставщик</div>
              <input type="text" value={expForm.vendor} onChange={function(e){setExpForm(Object.assign({},expForm,{vendor:e.target.value}))}} placeholder="Необязательно" style={inputStyle} />
            </div>
          </div>
        </div>
        <button className="btn btn-primary" style={{fontSize:16,padding:14}} onClick={saveExpense}>📉 Добавить расход</button>
      </div>
    )
  }

  // ═══ ДОХОДЫ ═══
  if (view === 'income') {
    return (
      <div className="page">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div className="section-title" style={{padding:0,margin:0}}>📈 Доходы</div>
          <button className="btn btn-primary" style={{width:'auto',padding:'10px 16px',fontSize:14,fontWeight:700}} onClick={function(){setView('addIncome')}}>+ Оплата</button>
        </div>
        <div className="card" style={{textAlign:'center',background:'linear-gradient(135deg, #5DAE8B, #3BA676)',color:'#fff',padding:16,borderRadius:16}}>
          <div style={{fontSize:11,opacity:0.8,textTransform:'uppercase',letterSpacing:1}}>Доходы за месяц</div>
          <div style={{fontSize:32,fontWeight:800,margin:'4px 0'}}>{totalIncome > 0 ? (totalIncome/1000000).toFixed(1) + 'M' : '0'} сум</div>
          <div style={{fontSize:12,opacity:0.7}}>{incomeList.length} оплат</div>
        </div>
        {loading && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}
        {!loading && incomeList.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Нет оплат. Нажмите «+ Оплата» чтобы добавить.</div>}
        {incomeList.map(function(i) {
          return (
            <div className="card" key={i.id} style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <div className="lesson-name" style={{fontSize:13}}>{i.student_name || '—'}</div>
                <div className="lesson-sub">{methodLabel(i.payment_method)} · {i.package_name || ''} · {i.income_date}</div>
                {i.created_by_name && <div style={{fontSize:10,color:'var(--text3)'}}>Добавил: {i.created_by_name}</div>}
              </div>
              <div style={{fontSize:16,fontWeight:700,color:'var(--green)'}}>+{(i.amount||0).toLocaleString()}</div>
            </div>
          )
        })}
      </div>
    )
  }

  // ═══ РАСХОДЫ ═══
  if (view === 'expenses') {
    return (
      <div className="page">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div className="section-title" style={{padding:0,margin:0}}>📉 Расходы</div>
          <button className="btn btn-primary" style={{width:'auto',padding:'10px 16px',fontSize:14,fontWeight:700}} onClick={function(){setView('addExpense')}}>+ Расход</button>
        </div>
        <div className="card" style={{textAlign:'center',background:'linear-gradient(135deg, #D4837D, #D4574E)',color:'#fff',padding:16,borderRadius:16}}>
          <div style={{fontSize:11,opacity:0.8,textTransform:'uppercase',letterSpacing:1}}>Расходы за месяц</div>
          <div style={{fontSize:32,fontWeight:800,margin:'4px 0'}}>{totalExpenses > 0 ? (totalExpenses/1000000).toFixed(1) + 'M' : '0'} сум</div>
          <div style={{fontSize:12,opacity:0.7}}>{expensesList.length} записей</div>
        </div>
        {loading && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}
        {!loading && expensesList.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Нет расходов. Нажмите «+ Расход» чтобы добавить.</div>}
        {expensesList.map(function(e) {
          return (
            <div className="card" key={e.id} style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <div className="lesson-name" style={{fontSize:13}}>{catLabel(e.category)}</div>
                <div className="lesson-sub">{e.description || '—'} · {e.branch_name || ''} · {e.expense_date}</div>
                {e.created_by_name && <div style={{fontSize:10,color:'var(--text3)'}}>Добавил: {e.created_by_name}</div>}
              </div>
              <div style={{fontSize:16,fontWeight:700,color:'var(--red)'}}>−{(e.amount||0).toLocaleString()}</div>
            </div>
          )
        })}
      </div>
    )
  }

  // ═══ P&L (ГЛАВНАЯ) ═══
  return (
    <div className="page">
      <div className="greeting"><h1>💰 Финансы</h1><p>P&L за текущий месяц</p></div>
      <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center',padding:16}}>
        <div><div style={{fontSize:20,fontWeight:800,color:'var(--green)'}}>{totalIncome > 0 ? (totalIncome/1000000).toFixed(1)+'M' : '0'}</div><div style={{fontSize:10,color:'var(--text2)'}}>Доходы</div></div>
        <div><div style={{fontSize:20,fontWeight:800,color:'var(--red)'}}>{totalExpenses > 0 ? (totalExpenses/1000000).toFixed(1)+'M' : '0'}</div><div style={{fontSize:10,color:'var(--text2)'}}>Расходы</div></div>
        <div><div style={{fontSize:20,fontWeight:800,color:profit>=0?'var(--green)':'var(--red)'}}>{profit !== 0 ? (profit/1000000).toFixed(1)+'M' : '0'}</div><div style={{fontSize:10,color:'var(--text2)'}}>Прибыль</div></div>
      </div>

      {/* Быстрые кнопки */}
      <div style={{display:'flex',gap:8,marginTop:8}}>
        <button className="btn btn-primary" style={{flex:1,padding:12,fontSize:14}} onClick={function(){setView('addIncome')}}>📈 + Оплата</button>
        <button className="btn btn-secondary" style={{flex:1,padding:12,fontSize:14,color:'var(--red)',borderColor:'var(--red)'}} onClick={function(){setView('addExpense')}}>📉 + Расход</button>
      </div>

      <div className="section-title">Последние доходы</div>
      {incomeList.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Нет данных</div>}
      {incomeList.slice(0,5).map(function(i) {
        return (<div className="card" key={i.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div className="lesson-name" style={{fontSize:13}}>{i.student_name||'—'}</div><div className="lesson-sub">{i.income_date} {i.created_by_name ? '· '+i.created_by_name : ''}</div></div>
          <div style={{fontWeight:700,color:'var(--green)'}}>+{(i.amount||0).toLocaleString()}</div>
        </div>)
      })}

      <div className="section-title">Последние расходы</div>
      {expensesList.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Нет данных</div>}
      {expensesList.slice(0,5).map(function(e) {
        return (<div className="card" key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div className="lesson-name" style={{fontSize:13}}>{catLabel(e.category)}</div><div className="lesson-sub">{e.expense_date} {e.created_by_name ? '· '+e.created_by_name : ''}</div></div>
          <div style={{fontWeight:700,color:'var(--red)'}}>−{(e.amount||0).toLocaleString()}</div>
        </div>)
      })}
    </div>
  )
}

