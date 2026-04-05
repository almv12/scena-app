export default async function handler(req, res) {
  var token = process.env.ALTEGIO_TOKEN
  var company = process.env.ALTEGIO_COMPANY
  var action = req.query.action
  var headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.api.v2+json',
    'Authorization': 'Bearer ' + token
  }

  try {
    if (action === 'staff') {
      var r = await fetch('https://app.alteg.io/api/v1/staff/' + company, { headers: headers })
      var data = await r.json()
      var list = []
      for (var i = 0; i < data.data.length; i++) {
        var s = data.data[i]
        list.push({ id: s.id, name: s.name, specialization: s.specialization, avatar: s.avatar })
      }
      return res.status(200).json({ ok: true, staff: list })
    }

    if (action === 'services') {
      var staffId = req.query.staff_id
      var r = await fetch('https://app.alteg.io/api/v2/companies/' + company + '/attendance_services/?staff_id=' + staffId + '&filter[is_available_for_timetable]=1&filter[is_multi]=0', { headers: headers })
      var data = await r.json()
      var list = []
      for (var i = 0; i < data.data.length; i++) {
        list.push(data.data[i].attributes)
      }
      return res.status(200).json({ ok: true, services: list })
    }

    if (action === 'search') {
      var phone = req.query.phone
      var r = await fetch('https://app.alteg.io/api/v1/company/' + company + '/clients/search', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          fields: ['name', 'surname', 'phone', 'email', 'visits_count'],
          order_by: 'id',
          filters: [{ type: 'quick_search', state: { value: phone } }]
        })
      })
      var data = await r.json()
      return res.status(200).json({ ok: true, clients: data.data || [] })
    }

    if (action === 'records') {
      var staffId = req.query.staff_id || ''
      var dateFrom = req.query.date_from || new Date().toISOString().slice(0, 10)
      var dateTo = req.query.date_to || dateFrom
      var url = 'https://app.alteg.io/api/v1/records/' + company + '?staff_id=' + staffId + '&start_date=' + dateFrom + '&end_date=' + dateTo
      var r = await fetch(url, { headers: headers })
      var data = await r.json()
      return res.status(200).json({ ok: true, records: data.data || [] })
    }

    return res.status(200).json({ ok: true, message: 'use ?action=staff or search or services or records' })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
