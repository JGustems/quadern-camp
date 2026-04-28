export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  )

  const FASES_LLUNA = (data) => {
    const d = new Date(data)
    const any = d.getFullYear(), mes = d.getMonth()+1, dia = d.getDate()
    let c, e, jd, b
    if (mes < 3) { const y=any-1; const m=mes+12; c=Math.floor(365.25*y); e=Math.floor(30.6*(m+1)); jd=c+e+dia-694039.09 }
    else { c=Math.floor(365.25*any); e=Math.floor(30.6*(mes+1)); jd=c+e+dia-694039.09 }
    jd /= 29.53; b=Math.floor(jd); jd -= b
    return Math.round(jd*8) % 8
  }

  const coords = {
    'All': { lat: 41.4731, lon: 1.5189 },
    'Begues': { lat: 41.3397, lon: 1.8731 },
    'Estoll': { lat: 41.5578, lon: 1.4889 },
    'Alp': { lat: 42.3718, lon: 1.8843 },
  }

  const { offset = 0 } = req.body || {}

  // Agafar 10 registres sense meteo
  const { data: registres } = await supabase
    .from('registres')
    .select('id, data, zona_id, zones(camp_id, camps(pobles(nom)))')
    .is('temp_max', null)
    .not('data', 'is', null)
    .order('data', { ascending: true })
    .range(offset, offset + 9)

  if (!registres?.length) {
    return res.status(200).json({ fet: true, processats: 0 })
  }

  let processats = 0
  for (const r of registres) {
    try {
      const poblenom = r.zones?.camps?.pobles?.nom
      const coord = coords[poblenom] || { lat: 41.38, lon: 2.17 }
      const dataR = r.data

      // Data inici (7 dies abans) i fi (7 dies després)
      const dataInici = new Date(dataR)
      dataInici.setDate(dataInici.getDate() - 7)
      const dataFi = new Date(dataR)
      dataFi.setDate(dataFi.getDate() + 7)
      const di = dataInici.toISOString().split('T')[0]
      const df = dataFi.toISOString().split('T')[0]

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=Europe/Madrid&start_date=${di}&end_date=${df}`
      const resp = await fetch(url)
      const json = await resp.json()

      if (!json.daily) continue

      const dies = json.daily.time
      const idxAvui = dies.indexOf(dataR)
      if (idxAvui < 0) continue

      const plujaPassada = json.daily.precipitation_sum
        .slice(0, idxAvui).reduce((s,v) => s+(v||0), 0)
      const plujaFutura = json.daily.precipitation_sum
        .slice(idxAvui+1).reduce((s,v) => s+(v||0), 0)

      const avui = new Date()
      const dataObj = new Date(dataR)
      const fa7Dies = new Date(avui); fa7Dies.setDate(fa7Dies.getDate()-7)
      const jaPassat = dataObj <= fa7Dies

      await supabase.from('registres').update({
        temp_max: Math.round(json.daily.temperature_2m_max[idxAvui]),
        temp_min: Math.round(json.daily.temperature_2m_min[idxAvui]),
        codi_temps: json.daily.weathercode[idxAvui],
        lluna: FASES_LLUNA(dataR),
        pluja_setmana: parseFloat(plujaPassada.toFixed(1)),
        pluja_prevista: parseFloat(plujaFutura.toFixed(1)),
        pluja_real: jaPassat ? parseFloat(plujaFutura.toFixed(1)) : null,
        meteo_actualitzada: jaPassat,
      }).eq('id', r.id)

      processats++
    } catch(e) {
      console.error('Error registre', r.id, e.message)
    }
  }

  return res.status(200).json({ 
    processats, 
    total: registres.length,
    seguent: offset + registres.length 
  })
}
