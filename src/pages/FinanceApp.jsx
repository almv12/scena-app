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
  var [editHistory, setEditHistory] = useState([])
  var [loading, setLoading] = useState(true)
  var [showIncomeForm, setShowIncomeForm] = useState(false)
  var [showExpenseForm, setShowExpenseForm] = useState(false)
  var [editModal, setEditModal] = useState(null) // {type:'income'|'expense', record:{...}}
  var [editReason, setEditReason] = useState('')
  var [showHistory, setShowHistory] = useState(false)
  var [incForm, setIncForm] = useState({ student_id:'', amount:'', payment_method:'cash', package_name:'', lessons_count:'', branch_name:'', notes:'', income_date:'' })
  var [expForm, setExpForm] = useState({ category:'other', description:'', amount:'', branch_name:'', vendor:'', expense_date:'' })

  var userName = user?.full_name || 'Неизвестный'
  var userRole = user?.role || 'admin'

  useEffect(function() { loadData() }, [page])

  async function loadData() {
    setLoading(true)
    var now = new Date()
    var dateFrom = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01'

    var [inc, exp, st, hist] = await Promise.all([
      supabase.from('income').select('*').gte('income_date', dateFrom).order('income_date', { ascending: false }),
      supabase.from('expenses').select('*').gte('expense_date', dateFrom).order('expense_date', { ascending: false }),
      supabase.from('users').select('id,full_name').eq('role','student').order('full_name'),
      supabase.from('finance_edits').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setIncomeList(inc.data || [])
    setExpensesList(exp.data || [])
    setStudents(st.data || [])
    setEditHistory(hist.data || [])
    setLoading(false)
  }

  // Логирование изменений
  async function logEdit(recordType, recordId, action, fieldChanged, oldValue, newValue, reason) {
    await supabase.from('finance_edits').insert({
      record_type: recordType,
      record_id: recordId,
      action: action,
      field_changed: fieldChanged,
      old_value: oldValue ? String(oldValue) : null,
      new_value: newValue ? String(newValue) : null,
      reason: reason,
      edited_by_name: userName,
      edited_by_role: userRole,
    })
  }

  // ДОБАВИТЬ ДОХОД
  async function saveIncome() {
    if (!incForm.amount) return
    var student = students.find(function(s) { return s.id === incForm.student_id })
    var { data, error } = await supabase.from('income').insert({
      student_id: incForm.student_id || null,
      student_name: student ? student.full_name : '',
      amount: parseInt(incForm.amount),
      payment_method: incForm.payment_method || 'cash',
      package_name: incForm.package_name || null,
      lessons_count: incForm.lessons_count ? parseInt(incForm.lessons_count) : null,
      branch_name: incForm.branch_name || null,
      notes: incForm.notes || null,
      income_date: incForm.income_date || new Date().toISOString().slice(0,10),
      created_by_name: userName,
      created_by_role: userRole,
    }).select().single()

    if (error) { alert('Ошибка: ' + error.message); return }

    // Логируем
    if (data) await logEdit('income', data.id, 'create', null, null, incForm.amount + ' сум', 'Новая оплата')

    // Автопополнение баланса
    if (incForm.student_id && incForm.lessons_count) {
      var { data: stData } = await supabase.from('users').select('lessons_balance').eq('id', incForm.student_id).single()
      if (stData) {
        await supabase.from('users').update({ lessons_balance: (stData.lessons_balance || 0) + parseInt(incForm.lessons_count), subscription_type: incForm.package_name || null }).eq('id', incForm.student_id)
      }
    }

    setShowIncomeForm(false)
    setIncForm({ student_id:'', amount:'', payment_method:'cash', package_name:'', lessons_count:'', branch_name:'', notes:'', income_date:'' })
    loadData()
  }

  // ДОБАВИТЬ РАСХОД
  async function saveExpense() {
    if (!expForm.amount || !expForm.category) return
    var { data, error } = await supabase.from('expenses').insert({
      category: expForm.category,
      description: expForm.description || null,
      amount: parseInt(expForm.amount),
      branch_name: expForm.branch_name || null,
      vendor: expForm.vendor || null,
      expense_date: expForm.expense_date || new Date().toISOString().slice(0,10),
      created_by_name: userName,
      created_by_role: userRole,
    }).select().single()

    if (error) { alert('Ошибка: ' + error.message); return }
    if (data) await logEdit('expense', data.id, 'create', null, null, expForm.amount + ' сум', 'Новый расход: ' + (expForm.description || expForm.category))

    setShowExpenseForm(false)
    setExpForm({ category:'other', description:'', amount:'', branch_name:'', vendor:'', expense_date:'' })
    loadData()
  }

  // РЕДАКТИРОВАТЬ ЗАПИСЬ (с причиной)
  async function saveEdit() {
    if (!editModal || !editReason.trim()) { alert('Укажите причину изменения'); return }
    var rec = editModal.record
    var type = editModal.type

    if (type === 'income') {
      var oldRec = incomeList.find(function(i) { return i.id === rec.id })
      await supabase.from('income').update({
        amount: parseInt(rec.amount),
        student_name: rec.student_name,
        payment_method: rec.payment_method,
        notes: rec.notes,
      }).eq('id', rec.id)
      await logEdit('income', rec.id, 'edit', 'amount', oldRec?.amount, rec.amount, editReason)
    } else {
      var oldExp = expensesList.find(function(e) { return e.id === rec.id })
      await supabase.from('expenses').update({
        amount: parseInt(rec.amount),
        description: rec.description,
        category: rec.category,
        vendor: rec.vendor,
      }).eq('id', rec.id)
      await logEdit('expense', rec.id, 'edit', 'amount', oldExp?.amount, rec.amount, editReason)
    }

    setEditModal(null)
    setEditReason('')
    loadData()
  }

  var totalIncome = incomeList.reduce(function(s,i) { return s + (i.amount||0) }, 0)
  var totalExpenses = expensesList.reduce(function(s,e) { return s + (e.amount||0) }, 0)
  var profit = totalIncome - totalExpenses

  var catLabel = function(id) { var f = EXPENSE_CATEGORIES.find(function(c){return c.id===id}); return f ? f.icon + ' ' + f.label : id }
  var methodLabel = function(id) { var f = PAYMENT_METHODS.find(function(m){return m.id===id}); return f ? f.label : id }

  var inputStyle = { width:'100%', padding:10, borderRadius:10, border:'1px solid var(--border)', fontSize:14, marginBottom:10, background:'var(--bg2)', color:'var(--text)' }

  // ═══ МОДАЛКА РЕДАКТИРОВАНИЯ ═══
  if (editModal) {
    var rec = editModal.record
    var isIncome = editModal.type === 'income'
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setEditModal(null);setEditReason('')}}>← Назад</button><span>Редактирование</span></div>
        <div className="card">
          <div style={{fontSize:14,fontWeight:700,marginBottom:12,color:'var(--gold)'}}>✏️ Редактировать {isIncome ? 'доход' : 'расход'}</div>

          {isIncome ? (
            <>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Ученик</div>
              <input type="text" value={rec.student_name||''} onChange={function(e){setEditModal({type:editModal.type,record:Object.assign({},rec,{student_name:e.target.value})})}} style={inputStyle} />
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Сумма</div>
              <input type="number" value={rec.amount||''} onChange={function(e){setEditModal({type:editModal.type,record:Object.assign({},rec,{amount:e.target.value})})}} style={inputStyle} />
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Способ</div>
              <select value={rec.payment_method||'cash'} onChange={function(e){setEditModal({type:editModal.type,record:Object.assign({},rec,{payment_method:e.target.value})})}} style={inputStyle}>
                {PAYMENT_METHODS.map(function(m){return <option key={m.id} value={m.id}>{m.label}</option>})}
              </select>
            </>
          ) : (
            <>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Категория</div>
              <select value={rec.category||'other'} onChange={function(e){setEditModal({type:editModal.type,record:Object.assign({},rec,{category:e.target.value})})}} style={inputStyle}>
                {EXPENSE_CATEGORIES.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.label}</option>})}
              </select>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Описание</div>
              <input type="text" value={rec.description||''} onChange={function(e){setEditModal({type:editModal.type,record:Object.assign({},rec,{description:e.target.value})})}} style={inputStyle} />
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Сумма</div>
              <input type="number" value={rec.amount||''} onChange={function(e){setEditModal({type:editModal.type,record:Object.assign({},rec,{amount:e.target.value})})}} style={inputStyle} />
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Поставщик</div>
              <input type="text" value={rec.vendor||''} onChange={function(e){setEditModal({type:editModal.type,record:Object.assign({},rec,{vendor:e.target.value})})}} style={inputStyle} />
            </>
          )}

          <div style={{fontSize:13,color:'var(--red)',fontWeight:700,marginBottom:4}}>⚠️ Причина изменения (обязательно)</div>
          <textarea value={editReason} onChange={function(e){setEditReason(e.target.value)}} placeholder="Почему вносите изменение..." rows={2} style={Object.assign({},inputStyle,{resize:'vertical'})} />

          <div style={{fontSize:11,color:'var(--text3)',marginBottom:10}}>Все изменения записываются в историю с указанием кто, когда и почему изменил.</div>
        </div>
        <button className="btn btn-primary" onClick={saveEdit} disabled={!editReason.trim()} style={{opacity:editReason.trim()?1:0.5}}>Сохранить изменения</button>
      </div>
    )
  }

  // ═══ ФОРМА ДОХОДА ═══
  if (showIncomeForm) {
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setShowIncomeForm(false)}}>← Назад</button><span>Добавить оплату</span></div>
        <div className="card">
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Ученик</div>
          <select value={incForm.student_id} onChange={function(e){setIncForm(Object.assign({},incForm,{student_id:e.target.value}))}} style={inputStyle}>
            <option value="">Выберите...</option>
            {students.map(function(s) { return <option key={s.id} value={s.id}>{s.full_name}</option> })}
          </select>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Сумма (сум)</div><input type="number" value={incForm.amount} onChange={function(e){setIncForm(Object.assign({},incForm,{amount:e.target.value}))}} placeholder="400000" style={inputStyle} /></div>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Способ</div><select value={incForm.payment_method} onChange={function(e){setIncForm(Object.assign({},incForm,{payment_method:e.target.value}))}} style={inputStyle}>{PAYMENT_METHODS.map(function(m){return <option key={m.id} value={m.id}>{m.label}</option>})}</select></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Пакет</div><input type="text" value={incForm.package_name} onChange={function(e){setIncForm(Object.assign({},incForm,{package_name:e.target.value}))}} placeholder="8 уроков" style={inputStyle} /></div>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Кол-во уроков</div><input type="number" value={incForm.lessons_count} onChange={function(e){setIncForm(Object.assign({},incForm,{lessons_count:e.target.value}))}} placeholder="8" style={inputStyle} /></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Филиал</div><select value={incForm.branch_name} onChange={function(e){setIncForm(Object.assign({},incForm,{branch_name:e.target.value}))}} style={inputStyle}><option value="">—</option><option value="Ганди 44">Ганди 44</option><option value="Ганди 29">Ганди 29</option></select></div>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Дата</div><input type="date" value={incForm.income_date||new Date().toISOString().slice(0,10)} onChange={function(e){setIncForm(Object.assign({},incForm,{income_date:e.target.value}))}} style={inputStyle} /></div>
          </div>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Заметки</div>
          <input type="text" value={incForm.notes} onChange={function(e){setIncForm(Object.assign({},incForm,{notes:e.target.value}))}} placeholder="Необязательно" style={inputStyle} />
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:10}}>Баланс ученика пополнится автоматически если выбран ученик и кол-во уроков</div>
        </div>
        <button className="btn btn-primary" onClick={saveIncome} disabled={!incForm.amount}>Добавить оплату</button>
      </div>
    )
  }

  // ═══ ФОРМА РАСХОДА ═══
  if (showExpenseForm) {
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setShowExpenseForm(false)}}>← Назад</button><span>Добавить расход</span></div>
        <div className="card">
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Категория</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
            {EXPENSE_CATEGORIES.map(function(c){var a=expForm.category===c.id;return <button key={c.id} style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,border:'2px solid '+(a?'var(--gold)':'var(--border)'),background:a?'var(--gold-light)':'var(--bg2)',color:a?'var(--gold)':'var(--text2)',cursor:'pointer'}} onClick={function(){setExpForm(Object.assign({},expForm,{category:c.id}))}}>{c.icon} {c.label}</button>})}
          </div>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Описание</div>
          <input type="text" value={expForm.description} onChange={function(e){setExpForm(Object.assign({},expForm,{description:e.target.value}))}} placeholder="За что платим" style={inputStyle} />
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Сумма (сум)</div><input type="number" value={expForm.amount} onChange={function(e){setExpForm(Object.assign({},expForm,{amount:e.target.value}))}} placeholder="500000" style={inputStyle} /></div>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Дата</div><input type="date" value={expForm.expense_date||new Date().toISOString().slice(0,10)} onChange={function(e){setExpForm(Object.assign({},expForm,{expense_date:e.target.value}))}} style={inputStyle} /></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Филиал</div><select value={expForm.branch_name} onChange={function(e){setExpForm(Object.assign({},expForm,{branch_name:e.target.value}))}} style={inputStyle}><option value="">—</option><option value="Ганди 44">Ганди 44</option><option value="Ганди 29">Ганди 29</option></select></div>
            <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>Поставщик</div><input type="text" value={expForm.vendor} onChange={function(e){setExpForm(Object.assign({},expForm,{vendor:e.target.value}))}} placeholder="Необязательно" style={inputStyle} /></div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveExpense} disabled={!expForm.amount}>Добавить расход</button>
      </div>
    )
  }

  // ═══ ИСТОРИЯ ИЗМЕНЕНИЙ ═══
  if (showHistory) {
    return (
      <div className="page">
        <div className="breadcrumb"><button onClick={function(){setShowHistory(false)}}>← Назад</button><span>История изменений</span></div>
        {editHistory.length === 0 ? <div className="card" style={{color:'var(--text2)',fontSize:13}}>Нет изменений</div> :
          editHistory.map(function(h) {
            return (
              <div className="card" key={h.id}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700}}>{h.action === 'create' ? '🆕 Создание' : '✏️ Изменение'} {h.record_type === 'income' ? 'дохода' : 'расхода'}</span>
                  <span style={{fontSize:10,color:'var(--text3)'}}>{h.created_at ? new Date(h.created_at).toLocaleString('ru') : ''}</span>
                </div>
                <div style={{fontSize:12,color:'var(--text2)'}}>👤 {h.edited_by_name} ({h.edited_by_role})</div>
                {h.field_changed && <div style={{fontSize:12,color:'var(--text2)'}}>📝 {h.old_value} → {h.new_value}</div>}
                <div style={{fontSize:12,color:'var(--gold)',fontWeight:600,marginTop:4}}>💬 {h.reason}</div>
              </div>
            )
          })
        }
      </div>
    )
  }

  // ═══ ДОХОДЫ ═══
  if (page === 'income') {
    return (
      <div className="page">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div className="section-title" style={{padding:0,margin:0}}>Доходы</div>
          <button className="btn btn-primary" style={{width:'auto',padding:'8px 14px',fontSize:13}} onClick={function(){setShowIncomeForm(true)}}>+ Оплата</button>
        </div>
        <div className="card" style={{textAlign:'center',background:'linear-gradient(135deg, var(--green-light), var(--green))',color:'#fff',padding:16}}>
          <div style={{fontSize:11,opacity:0.8,textTransform:'uppercase'}}>Доходы за месяц</div>
          <div style={{fontSize:28,fontWeight:800}}>{totalIncome > 0 ? (totalIncome/1000000).toFixed(1) + 'M' : '0'} сум</div>
        </div>
        {loading && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}
        {incomeList.map(function(i) {
          return (
            <div className="card" key={i.id} style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <div className="lesson-name" style={{fontSize:13}}>{i.student_name || '—'}</div>
                <div className="lesson-sub">{methodLabel(i.payment_method)} · {i.package_name || ''} · {i.income_date}</div>
                {i.created_by_name && <div style={{fontSize:10,color:'var(--text3)'}}>Добавил: {i.created_by_name}</div>}
              </div>
              <div style={{fontSize:15,fontWeight:700,color:'var(--green)'}}>+{(i.amount||0).toLocaleString()}</div>
              <button style={{background:'none',border:'none',fontSize:14,cursor:'pointer',padding:4}} onClick={function(){setEditModal({type:'income',record:Object.assign({},i)})}}>✏️</button>
            </div>
          )
        })}
        {!loading && incomeList.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Нет данных</div>}
      </div>
    )
  }

  // ═══ РАСХОДЫ ═══
  if (page === 'expenses') {
    return (
      <div className="page">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div className="section-title" style={{padding:0,margin:0}}>Расходы</div>
          <button className="btn btn-primary" style={{width:'auto',padding:'8px 14px',fontSize:13}} onClick={function(){setShowExpenseForm(true)}}>+ Расход</button>
        </div>
        <div className="card" style={{textAlign:'center',background:'linear-gradient(135deg, var(--red-light), var(--red))',color:'#fff',padding:16}}>
          <div style={{fontSize:11,opacity:0.8,textTransform:'uppercase'}}>Расходы за месяц</div>
          <div style={{fontSize:28,fontWeight:800}}>{totalExpenses > 0 ? (totalExpenses/1000000).toFixed(1) + 'M' : '0'} сум</div>
        </div>
        {loading && <div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div>}
        {expensesList.map(function(e) {
          return (
            <div className="card" key={e.id} style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <div className="lesson-name" style={{fontSize:13}}>{catLabel(e.category)}</div>
                <div className="lesson-sub">{e.description || '—'} · {e.branch_name || ''} · {e.expense_date}</div>
                {e.created_by_name && <div style={{fontSize:10,color:'var(--text3)'}}>Добавил: {e.created_by_name}</div>}
              </div>
              <div style={{fontSize:15,fontWeight:700,color:'var(--red)'}}>−{(e.amount||0).toLocaleString()}</div>
              <button style={{background:'none',border:'none',fontSize:14,cursor:'pointer',padding:4}} onClick={function(){setEditModal({type:'expense',record:Object.assign({},e)})}}>✏️</button>
            </div>
          )
        })}
        {!loading && expensesList.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Нет данных</div>}
      </div>
    )
  }

  // ═══ P&L (главная) ═══
  return (
    <div className="page">
      <div className="greeting"><h1>Финансы</h1><p>P&L за текущий месяц</p></div>
      <div className="card" style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
        <div><div style={{fontSize:18,fontWeight:700,color:'var(--green)'}}>{totalIncome > 0 ? (totalIncome/1000000).toFixed(1)+'M' : '0'}</div><div style={{fontSize:10,color:'var(--text2)'}}>Доходы</div></div>
        <div><div style={{fontSize:18,fontWeight:700,color:'var(--red)'}}>{totalExpenses > 0 ? (totalExpenses/1000000).toFixed(1)+'M' : '0'}</div><div style={{fontSize:10,color:'var(--text2)'}}>Расходы</div></div>
        <div><div style={{fontSize:18,fontWeight:700,color:profit>=0?'var(--green)':'var(--red)'}}>{profit !== 0 ? (profit/1000000).toFixed(1)+'M' : '0'}</div><div style={{fontSize:10,color:'var(--text2)'}}>Прибыль</div></div>
      </div>

      <div className="section-title">Последние доходы</div>
      {incomeList.slice(0,5).map(function(i) {
        return (<div className="card" key={i.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div className="lesson-name" style={{fontSize:13}}>{i.student_name||'—'}</div><div className="lesson-sub">{i.income_date} {i.created_by_name ? '· '+i.created_by_name : ''}</div></div>
          <div style={{fontWeight:700,color:'var(--green)'}}>+{(i.amount||0).toLocaleString()}</div>
        </div>)
      })}

      <div className="section-title">Последние расходы</div>
      {expensesList.slice(0,5).map(function(e) {
        return (<div className="card" key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div className="lesson-name" style={{fontSize:13}}>{catLabel(e.category)}</div><div className="lesson-sub">{e.expense_date} {e.created_by_name ? '· '+e.created_by_name : ''}</div></div>
          <div style={{fontWeight:700,color:'var(--red)'}}>−{(e.amount||0).toLocaleString()}</div>
        </div>)
      })}

      {/* Кнопка истории изменений */}
      <button className="btn btn-secondary" style={{marginTop:12,fontSize:13}} onClick={function(){setShowHistory(true)}}>📋 История изменений</button>

      {!loading && incomeList.length === 0 && expensesList.length === 0 && (
        <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Добавьте доходы и расходы через вкладки внизу</div>
      )}
    </div>
  )
}

