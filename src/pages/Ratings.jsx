import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Ratings() {
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(function() { load() }, [])

  async function load() {
    var { data } = await supabase.from('lesson_ratings').select('*').order('created_at', { ascending: false }).limit(100)
    if (data) setRatings(data)
    setLoading(false)
  }

  var byTeacher = {}
  ratings.forEach(function(r) {
    var name = r.teacher_name || 'Без педагога'
    if (!byTeacher[name]) byTeacher[name] = { total: 0, sum: 0, ratings: [] }
    byTeacher[name].total++
    byTeacher[name].sum += r.rating
    byTeacher[name].ratings.push(r)
  })

  var teachers = Object.keys(byTeacher).sort(function(a,b) {
    return (byTeacher[b].sum / byTeacher[b].total) - (byTeacher[a].sum / byTeacher[a].total)
  })

  var avgAll = ratings.length > 0 ? (ratings.reduce(function(s,r){return s+r.rating},0) / ratings.length).toFixed(1) : '—'

  function stars(n) {
    var s = ''
    for (var i = 0; i < 5; i++) { s += i < Math.round(n) ? '⭐' : '☆' }
    return s
  }

  if (loading) return <div className="page"><div className="card" style={{color:'var(--text2)',fontSize:13}}>Загрузка...</div></div>

  return (
    <div className="page">
      <div className="card" style={{textAlign:'center'}}>
        <div style={{fontSize:11,color:'var(--text2)',marginBottom:4}}>Средний рейтинг школы</div>
        <div style={{fontSize:32,fontWeight:700,color:'var(--gold)'}}>{avgAll}</div>
        <div style={{fontSize:14}}>{stars(avgAll)}</div>
        <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>{ratings.length} оценок</div>
      </div>

      <div className="section-title">По педагогам</div>
      {teachers.map(function(name) {
        var data = byTeacher[name]
        var avg = (data.sum / data.total).toFixed(1)
        return (
          <div className="card" key={name}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <div className="lesson-name">{name}</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:18,fontWeight:700,color:'var(--gold)'}}>{avg}</span>
                <span style={{fontSize:12,color:'var(--text3)'}}>({data.total})</span>
              </div>
            </div>
            <div style={{fontSize:12,marginBottom:8}}>{stars(avg)}</div>
            {data.ratings.slice(0,3).map(function(r) {
              if (!r.comment) return null
              return (
                <div key={r.id} style={{padding:'6px 0',borderTop:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontSize:12}}>{stars(r.rating)}</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>{r.lesson_date}</div>
                  </div>
                  <div style={{fontSize:13,color:'var(--text2)',marginTop:2}}>{r.comment}</div>
                </div>
              )
            })}
          </div>
        )
      })}

      {ratings.length === 0 && <div className="card" style={{textAlign:'center',color:'var(--text2)',fontSize:13}}>Оценок пока нет</div>}

      <div className="section-title">Последние отзывы</div>
      {ratings.slice(0,10).map(function(r) {
        return (
          <div className="card" key={r.id}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div className="lesson-name" style={{fontSize:13}}>{r.teacher_name} · {r.instrument}</div>
              <div style={{fontSize:12}}>{stars(r.rating)}</div>
            </div>
            {r.comment && <div style={{fontSize:13,color:'var(--text2)',marginTop:4}}>{r.comment}</div>}
            <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{r.lesson_date}</div>
          </div>
        )
      })}
    </div>
  )
}
