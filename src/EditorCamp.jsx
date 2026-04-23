import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

const AM_FILA = 150
const AL_FILA = 80
const ESCALA = 0.6

export default function EditorCamp({ camp, onTancar, onGuardat }) {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('select')
  const [zones, setZones] = useState([])
  const [perimetre, setPerimetre] = useState([])
  const [ptsDibuix, setPtsDibuix] = useState([])
  const [zonesSeleccionades, setZonesSeleccionades] = useState([])
  const [dragPt, setDragPt] = useState(null)
  const [dragTarget, setDragTarget] = useState(null)
  const [guardant, setGuardant] = useState(false)
  const [nomZona, setNomZona] = useState('')
  const [tipusZona, setTipusZona] = useState('permanent')
  const [colorZona, setColorZona] = useState('#C0DD97')
  const [numFiles, setNumFiles] = useState(6)
  const [numPosicions, setNumPosicions] = useState(6)
  const [filaInici, setFilaInici] = useState(1)
  const [x0Files, setX0Files] = useState(100)
  const [y0Files, setY0Files] = useState(100)
  const [mousePosReal, setMousePosReal] = useState(null)
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 600 })
  const [nomPosicions, setNomPosicions] = useState({})
  const [missatges, setMissatges] = useState([])
  const [zonesAEliminar, setZonesAEliminar] = useState([])

  const COLORS = ['#FAC775','#C0DD97','#9FE1CB','#F5C4B3','#F4C0D1','#B5D4F4','#D3D1C7','#F7C1C1','#EAF3DE','#D4B5F4']

  const hints = {
    select: 'Clic per seleccionar · clic de nou per deseleccionar',
    perimetre: 'Clica per afegir punts · "Tancar perímetre" per acabar',
    zona: 'Clica per dibuixar una zona · "Tancar zona" per acabar',
    files: 'Configura les files i clica "Afegir files"',
    moure: 'Arrossega els punts grocs per moure\'ls',
  }

  useEffect(() => { carregaDades() }, [camp])
  useEffect(() => { dibuixa() }, [zones, perimetre, ptsDibuix, zonesSeleccionades, mode, canvasSize, nomPosicions, zonesAEliminar])

  async function carregaDades() {
    if (!camp) return
    if (camp.zones_geojson?.points) setPerimetre(camp.zones_geojson.points)
    const { data } = await supabase.from('zones').select('*').eq('camp_id', camp.id).order('codi')
    setZones(data || [])
  }

  function afegirMissatge(text, tipus = 'info') {
    const id = Date.now()
    setMissatges(prev => [...prev, { id, text, tipus }])
    setTimeout(() => setMissatges(prev => prev.filter(m => m.id !== id)), 4000)
  }

  function getPts(zona) {
    if (zona.forma_geojson?.points) return zona.forma_geojson.points
    if (zona.fila != null) {
      const x0 = zona._x0 ?? 100
      const y0 = zona._y0 ?? 100
      const col = zona.fila - 1
      const row = (zona.posicio_inici ?? 1) - 1
      return [
        {x: x0+col*AM_FILA, y: y0+row*AL_FILA},
        {x: x0+col*AM_FILA+AM_FILA, y: y0+row*AL_FILA},
        {x: x0+col*AM_FILA+AM_FILA, y: y0+row*AL_FILA+AL_FILA},
        {x: x0+col*AM_FILA, y: y0+row*AL_FILA+AL_FILA},
      ]
    }
    return []
  }

  function calcularCanvasSize() {
    const zonesVisibles = zones.filter(z => !zonesAEliminar.includes(z.id || z.tempId))
    const tots = [...perimetre, ...zonesVisibles.flatMap(z => getPts(z)), ...ptsDibuix]
    if (!tots.length) return { w: 900, h: 600 }
    const maxX = Math.max(...tots.map(p => p.x)) * ESCALA + 80
    const maxY = Math.max(...tots.map(p => p.y)) * ESCALA + 80
    return { w: Math.max(900, maxX), h: Math.max(600, maxY) }
  }

  function estaSeleccionada(zona) {
    return zonesSeleccionades.some(z => (z.id && z.id === zona.id) || (z.tempId && z.tempId === zona.tempId))
  }

  function estaEliminada(zona) {
    return zonesAEliminar.includes(zona.id || zona.tempId)
  }

  function centroid(pts) {
    return { x: pts.reduce((s,p)=>s+p.x,0)/pts.length, y: pts.reduce((s,p)=>s+p.y,0)/pts.length }
  }

  function ptInPoly(px, py, pts) {
    let inside = false
    for (let i=0,j=pts.length-1; i<pts.length; j=i++) {
      const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y
      if (((yi>py)!=(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside
    }
    return inside
  }

  function dibuixa() {
    const canvas = canvasRef.current
    if (!canvas) return
    const nouSize = calcularCanvasSize()
    if (nouSize.w !== canvasSize.w || nouSize.h !== canvasSize.h) {
      setCanvasSize(nouSize)
      return
    }
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.fillStyle = '#f0ede8'
    ctx.fillRect(0,0,canvas.width,canvas.height)

    ctx.strokeStyle = 'rgba(0,0,0,0.05)'
    ctx.lineWidth = 1
    for (let x=0; x<canvas.width; x+=50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke() }
    for (let y=0; y<canvas.height; y+=50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke() }

    if (perimetre.length > 1) {
      ctx.beginPath()
      perimetre.forEach((p,i) => i===0 ? ctx.moveTo(p.x*ESCALA,p.y*ESCALA) : ctx.lineTo(p.x*ESCALA,p.y*ESCALA))
      ctx.closePath()
      ctx.fillStyle = '#e8e4de'
      ctx.fill()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    zones.filter(z => !estaEliminada(z)).forEach(zona => {
      const pts = getPts(zona)
      if (!pts.length) return
      const sel = estaSeleccionada(zona)

      ctx.beginPath()
      pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x*ESCALA,p.y*ESCALA) : ctx.lineTo(p.x*ESCALA,p.y*ESCALA))
      ctx.closePath()
      ctx.fillStyle = zona.color || '#C0DD97'
      ctx.globalAlpha = sel ? 1 : 0.75
      ctx.fill()
      ctx.globalAlpha = 1

      if (sel) {
        ctx.fillStyle = 'rgba(29,158,117,0.2)'
        ctx.fill()
        ctx.strokeStyle = '#1D9E75'
        ctx.lineWidth = 3
        ctx.stroke()
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      const c = centroid(pts)
      const nomPos = nomPosicions[zona.id||zona.tempId]
      const nomX = nomPos ? nomPos.x : c.x
      const nomY = nomPos ? nomPos.y : c.y
      ctx.fillStyle = sel ? '#0F6E56' : 'rgba(0,0,0,0.75)'
      ctx.font = sel ? 'bold 12px system-ui' : '11px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(zona.nom || zona.codi, nomX*ESCALA, nomY*ESCALA)

      if (sel && mode === 'select') {
        ctx.beginPath(); ctx.arc(nomX*ESCALA, nomY*ESCALA, 4, 0, Math.PI*2)
        ctx.fillStyle = '#1D9E75'; ctx.fill()
      }

      if (sel && (mode === 'moure' || mode === 'select')) {
        pts.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x*ESCALA,p.y*ESCALA,6,0,Math.PI*2)
          ctx.fillStyle = '#FFD700'; ctx.fill()
          ctx.strokeStyle = '#1D9E75'; ctx.lineWidth = 2; ctx.stroke()
        })
      }
    })

    if (ptsDibuix.length) {
      ctx.beginPath()
      ptsDibuix.forEach((p,i) => i===0 ? ctx.moveTo(p.x*ESCALA,p.y*ESCALA) : ctx.lineTo(p.x*ESCALA,p.y*ESCALA))
      ctx.strokeStyle = '#1D9E75'
      ctx.lineWidth = 2
      ctx.setLineDash([5,4])
      ctx.stroke()
      ctx.setLineDash([])
      ptsDibuix.forEach((p,i) => {
        ctx.beginPath(); ctx.arc(p.x*ESCALA,p.y*ESCALA,5,0,Math.PI*2)
        ctx.fillStyle = i===0 ? '#1D9E75' : 'white'
        ctx.fill()
        ctx.strokeStyle = '#1D9E75'; ctx.lineWidth = 1.5; ctx.stroke()
      })
    }

    if (mode === 'perimetre' || mode === 'moure') {
      perimetre.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x*ESCALA,p.y*ESCALA,5,0,Math.PI*2)
        ctx.fillStyle = '#1D9E75'; ctx.fill()
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke()
      })
    }
  }

  function getCanvasPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: ((e.clientX - rect.left) * scaleX) / ESCALA,
      y: ((e.clientY - rect.top) * scaleY) / ESCALA
    }
  }

  function handleClick(e) {
    const {x, y} = getCanvasPos(e)

    if (mode === 'perimetre') { setPtsDibuix(prev => [...prev, {x,y}]); return }
    if (mode === 'zona') { setPtsDibuix(prev => [...prev, {x,y}]); return }

    if (mode === 'moure') {
      if (e.button === 2) {
        const RADI = 15
        const idx = perimetre.findIndex(p => Math.hypot(x-p.x, y-p.y) < RADI)
        if (idx >= 0 && perimetre.length > 3) {
          setPerimetre(prev => prev.filter((_,i) => i !== idx))
        }
        return
      }
      const RADI = 20
      let millorIdx = -1, millorDist = Infinity
      for (let i=0; i<perimetre.length; i++) {
        const a = perimetre[i]
        const b = perimetre[(i+1)%perimetre.length]
        const mx = (a.x+b.x)/2, my = (a.y+b.y)/2
        const dist = Math.hypot(x-mx, y-my)
        if (dist < millorDist && dist < RADI*3) { millorDist = dist; millorIdx = i }
      }
      if (millorIdx >= 0) {
        setPerimetre(prev => [...prev.slice(0,millorIdx+1), {x,y}, ...prev.slice(millorIdx+1)])
        return
      }
      return
    }

    if (mode === 'select') {
      let trobada = null
      for (let i=zones.length-1; i>=0; i--) {
        if (estaEliminada(zones[i])) continue
        const pts = getPts(zones[i])
        if (pts.length && ptInPoly(x, y, pts)) { trobada = zones[i]; break }
      }
      if (trobada) {
        setZonesSeleccionades(prev => {
          const jaHi = prev.some(z => (z.id && z.id===trobada.id)||(z.tempId && z.tempId===trobada.tempId))
          if (jaHi) return prev.filter(z => !((z.id && z.id===trobada.id)||(z.tempId && z.tempId===trobada.tempId)))
          return [...prev, trobada]
        })
        setNomZona(trobada.nom || trobada.codi || '')
        setTipusZona(trobada.es_permanent ? 'permanent' : 'cultiu')
        setColorZona(trobada.color || '#C0DD97')
      } else {
        setZonesSeleccionades([])
      }
    }
  }

  function tancarPerimetre() {
    if (ptsDibuix.length < 3) return
    setPerimetre(ptsDibuix)
    setPtsDibuix([])
    afegirMissatge('Perímetre definit correctament', 'ok')
  }

  function tancarZona() {
    if (ptsDibuix.length < 3) return
    const codi = nomZona || `Z${zones.filter(z=>!estaEliminada(z)).length+1}`
    const duplicat = zones.find(z => !estaEliminada(z) && (z.codi===codi || z.nom===codi))
    if (duplicat) {
      afegirMissatge(`Ja existeix una zona amb el nom "${codi}"`, 'error')
      return
    }
    const novaZona = {
      tempId: Date.now(),
      camp_id: camp.id,
      codi,
      nom: codi,
      tipus: tipusZona,
      es_permanent: tipusZona !== 'cultiu',
      color: colorZona,
      forma_geojson: { type:'polygon', points: [...ptsDibuix] },
    }
    setZones(prev => [...prev, novaZona])
    setZonesSeleccionades([novaZona])
    setPtsDibuix([])
    afegirMissatge(`Zona "${codi}" creada`, 'ok')
  }

  function handleMouseDown(e) {
    const {x, y} = getCanvasPos(e)
    if (mode === 'select' && zonesSeleccionades.length === 1) {
      const zona = zonesSeleccionades[0]
      const pts = getPts(zona)
      const c = pts.length ? centroid(pts) : {x:0,y:0}
      const nomPos = nomPosicions[zona.id||zona.tempId] || c
      if (Math.hypot(x-nomPos.x, y-nomPos.y) < 15/ESCALA) {
        setDragTarget('nom')
        setDragPt(zona.id||zona.tempId)
        return
      }
    }
    if (mode !== 'moure') return
    const RADI = 15
    for (let i=0; i<perimetre.length; i++) {
      if (Math.hypot(x-perimetre[i].x, y-perimetre[i].y) < RADI) {
        setDragTarget('perimetre'); setDragPt(i); return
      }
    }
    for (const zona of zonesSeleccionades) {
      const pts = getPts(zona)
      for (let i=0; i<pts.length; i++) {
        if (Math.hypot(x-pts[i].x, y-pts[i].y) < RADI) {
          setDragTarget('zona'); setDragPt(i); return
        }
      }
    }
  }

  function handleMouseMove(e) {
    const {x, y} = getCanvasPos(e)
    const mX = (x/100).toFixed(2), mY = (y/100).toFixed(2)
    let info = `X: ${mX}m  Y: ${mY}m`
    if (ptsDibuix.length > 0) {
      const ultim = ptsDibuix[ptsDibuix.length-1]
      const dist = Math.hypot(x-ultim.x, y-ultim.y)
      info += `  |  Dist: ${(dist/100).toFixed(2)}m`
    }
    setMousePosReal(info)

    if (dragPt === null) return
    if (dragTarget === 'nom') {
      setNomPosicions(prev => ({...prev, [dragPt]: {x,y}}))
      return
    }
    if (dragTarget === 'perimetre') {
      setPerimetre(prev => prev.map((p,i) => i===dragPt ? {x,y} : p))
    } else if (dragTarget === 'zona' && zonesSeleccionades.length > 0) {
      const zona = zonesSeleccionades[0]
      setZones(prev => prev.map(z => {
        if ((z.id && z.id===zona.id)||(z.tempId && z.tempId===zona.tempId)) {
          const pts = (z.forma_geojson?.points || getPts(z)).map((p,i) => i===dragPt ? {x,y} : p)
          const zonaActualitzada = {...z, forma_geojson:{type:'polygon', points:pts}}
          setZonesSeleccionades([zonaActualitzada])
          return zonaActualitzada
        }
        return z
      }))
    }
  }

  function handleMouseUp() { setDragPt(null); setDragTarget(null) }

  function afegirFiles() {
    const novesZones = []
    const errors = []
    for (let col=0; col<numFiles; col++) {
      for (let row=0; row<numPosicions; row++) {
        const fila = filaInici + col
        const pos = row + 1
        const codi = (fila*10+pos).toString()
        const jaExisteix = zones.find(z => z.codi===codi && !z.es_permanent && !estaEliminada(z))
        if (jaExisteix) {
          errors.push(codi)
        } else {
          novesZones.push({
            tempId: Date.now()+col*100+row,
            camp_id: camp.id, codi, nom: codi,
            tipus: 'cultiu', es_permanent: false,
            fila, posicio_inici: pos, posicio_fi: pos, tub_reg: fila,
            amplada_m: 1.5, llargada_m: 80, color: '#e8e4de',
            _x0: x0Files, _y0: y0Files,
          })
        }
      }
    }
    if (errors.length > 0) {
      afegirMissatge(`Zones ja existents (no afegides): ${errors.join(', ')}`, 'warn')
    }
    if (novesZones.length > 0) {
      setZones(prev => [...prev, ...novesZones])
      afegirMissatge(`${novesZones.length} files afegides correctament`, 'ok')
    }
  }

  function actualitzarZonesSeleccionades() {
    if (zonesSeleccionades.length === 1) {
      const codi = nomZona
      const duplicat = zones.find(z =>
        !estaEliminada(z) &&
        (z.codi===codi || z.nom===codi) &&
        z.id !== zonesSeleccionades[0].id &&
        z.tempId !== zonesSeleccionades[0].tempId
      )
      if (duplicat) {
        afegirMissatge(`Ja existeix una zona amb el nom "${codi}"`, 'error')
        return
      }
    }
    setZones(prev => prev.map(z => {
      if (estaSeleccionada(z)) {
        return {
          ...z,
          nom: zonesSeleccionades.length === 1 ? nomZona : z.nom,
          codi: zonesSeleccionades.length === 1 ? nomZona : z.codi,
          es_permanent: tipusZona !== 'cultiu',
          color: colorZona,
        }
      }
      return z
    }))
    afegirMissatge('Zona actualitzada', 'ok')
  }

  async function eliminarZonesSeleccionades() {
    const ambRegistres = []
    for (const zona of zonesSeleccionades) {
      if (zona.id) {
        const { count } = await supabase
          .from('registres')
          .select('id', { count: 'exact', head: true })
          .eq('zona_id', zona.id)
        if (count > 0) ambRegistres.push(`${zona.nom||zona.codi} (${count} registres)`)
      }
    }
    if (ambRegistres.length > 0) {
      afegirMissatge(`No es poden eliminar zones amb registres: ${ambRegistres.join(', ')}`, 'error')
      return
    }
    const idsAEliminar = zonesSeleccionades.map(z => z.id || z.tempId)
    setZonesAEliminar(prev => [...prev, ...idsAEliminar.filter(id => typeof id === 'number' && !String(id).startsWith('1'))])
    setZones(prev => prev.filter(z => !idsAEliminar.includes(z.tempId)))
    setZonesSeleccionades([])
    afegirMissatge(`${idsAEliminar.length} zona(es) eliminada(es)`, 'ok')
  }

  async function guardar() {
    setGuardant(true)
    setMissatges([])

    try {
      // Guardar perímetre
      await supabase.from('camps').update({
        zones_geojson: perimetre.length ? {type:'polygon', points:perimetre} : null
      }).eq('id', camp.id)

      // Eliminar zones marcades per eliminar
      if (zonesAEliminar.length) {
        await supabase.from('zones').delete().in('id', zonesAEliminar)
      }

      // Zones existents a la BD — UPDATE
      const zonesExistents = zones.filter(z => z.id && !zonesAEliminar.includes(z.id))
      for (const z of zonesExistents) {
        let forma = z.forma_geojson || null
        if (!forma && z.fila != null) {
          const pts = getPts(z)
          if (pts.length) forma = { type:'polygon', points: pts }
        }
        await supabase.from('zones').update({
          codi: z.codi, nom: z.nom,
          tipus: z.tipus || (z.es_permanent ? 'permanent' : 'cultiu'),
          es_permanent: z.es_permanent || false,
          fila: z.fila || null, posicio_inici: z.posicio_inici || null,
          posicio_fi: z.posicio_fi || null, tub_reg: z.tub_reg || null,
          amplada_m: z.amplada_m || 1.5, llargada_m: z.llargada_m || 80,
          forma_geojson: forma, color: z.color || null,
        }).eq('id', z.id)
      }

      // Zones noves — INSERT
      const zonesNoves = zones.filter(z => z.tempId && !z.id)
      if (zonesNoves.length) {
        const zonesAInserir = zonesNoves.map(z => {
          let forma = z.forma_geojson || null
          if (!forma && z.fila != null) {
            const pts = getPts(z)
            if (pts.length) forma = { type:'polygon', points: pts }
          }
          return {
            camp_id: camp.id, codi: z.codi, nom: z.nom,
            tipus: z.tipus || (z.es_permanent ? 'permanent' : 'cultiu'),
            es_permanent: z.es_permanent || false,
            fila: z.fila || null, posicio_inici: z.posicio_inici || null,
            posicio_fi: z.posicio_fi || null, tub_reg: z.tub_reg || null,
            amplada_m: z.amplada_m || 1.5, llargada_m: z.llargada_m || 80,
            forma_geojson: forma, color: z.color || null,
          }
        })
        const { error } = await supabase.from('zones').insert(zonesAInserir)
        if (error) {
          afegirMissatge(`Error en guardar zones noves: ${error.message}`, 'error')
          setGuardant(false)
          return
        }
      }

      afegirMissatge('Tot guardat correctament ✅', 'ok')
      setTimeout(() => { onGuardat && onGuardat() }, 1500)
    } catch (err) {
      afegirMissatge(`Error inesperat: ${err.message}`, 'error')
    }
    setGuardant(false)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={{flex:1}}>
            <div style={styles.titol}>Editor — {camp?.nom}</div>
            <div style={styles.hint}>{hints[mode]}</div>
          </div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <button style={styles.botoGuardar} onClick={guardar} disabled={guardant}>
              {guardant ? 'Guardant...' : '💾 Guardar tot'}
            </button>
            <button style={styles.botoTancar} onClick={onTancar}>✕</button>
          </div>
        </div>

        {/* Missatges */}
        {missatges.length > 0 && (
          <div style={{padding:'6px 16px', display:'flex', flexDirection:'column', gap:'4px', flexShrink:0}}>
            {missatges.map(m => (
              <div key={m.id} style={{
                padding:'6px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:'500',
                background: m.tipus==='ok'?'#E1F5EE':m.tipus==='error'?'#FEE2E2':'#FEF9C3',
                color: m.tipus==='ok'?'#0F6E56':m.tipus==='error'?'#991B1B':'#854D0E',
              }}>
                {m.text}
              </div>
            ))}
          </div>
        )}

        <div style={styles.toolbar}>
          {[
            {id:'select', label:'Seleccionar', icon:'↖'},
            {id:'perimetre', label:'Perímetre', icon:'⬡'},
            {id:'zona', label:'Zona lliure', icon:'✏️'},
            {id:'files', label:'Afegir files', icon:'⊞'},
            {id:'moure', label:'Moure punts', icon:'⤢'},
          ].map(b => (
            <button key={b.id}
              style={{...styles.modeBtn, ...(mode===b.id?styles.modeBtnActiu:{})}}
              onClick={() => { setMode(b.id); setPtsDibuix([]) }}>
              {b.icon} {b.label}
            </button>
          ))}
          {mode === 'perimetre' && ptsDibuix.length >= 3 && (
            <button style={styles.botoAccio} onClick={tancarPerimetre}>✅ Tancar perímetre</button>
          )}
          {mode === 'perimetre' && ptsDibuix.length > 0 && (
            <button style={{...styles.botoAccio, background:'#888'}}
              onClick={() => setPtsDibuix(prev => prev.slice(0,-1))}>
              ← Desfer punt
            </button>
          )}
          {mode === 'moure' && perimetre.length > 0 && (
            <button style={{...styles.botoAccio, background:'#e55'}}
              onClick={() => { if(window.confirm('Eliminar tot el perímetre?')) setPerimetre([]) }}>
              🗑 Esborrar perímetre
            </button>
          )}
          {mode === 'zona' && ptsDibuix.length >= 3 && (
            <button style={styles.botoAccio} onClick={tancarZona}>✅ Tancar zona</button>
          )}
          {ptsDibuix.length > 0 && (
            <button style={{...styles.botoAccio, background:'#e55'}} onClick={() => setPtsDibuix([])}>✕ Cancel·lar</button>
          )}
        </div>

        <div style={styles.cos}>
          <div style={styles.canvasWrap}>
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{cursor: mode==='moure'?'crosshair':'pointer', display:'block'}}
            />
            {mousePosReal && (
              <div style={styles.posInfo}>{mousePosReal}</div>
            )}
          </div>

          <div style={styles.panell}>
            {mode === 'files' && (
              <div>
                <div style={styles.seccio}>Files estàndard (1,5m × 80cm)</div>
                <div style={styles.grup}>
                  <label style={styles.label}>Fila inicial</label>
                  <input type="number" style={styles.input} value={filaInici} min="1"
                    onChange={e => setFilaInici(parseInt(e.target.value)||1)}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Nombre de files</label>
                  <input type="number" style={styles.input} value={numFiles} min="1" max="20"
                    onChange={e => setNumFiles(parseInt(e.target.value)||1)}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Posicions per fila</label>
                  <input type="number" style={styles.input} value={numPosicions} min="1" max="12"
                    onChange={e => setNumPosicions(parseInt(e.target.value)||1)}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>X inici (cm)</label>
                  <input type="number" style={styles.input} value={x0Files}
                    onChange={e => setX0Files(parseInt(e.target.value)||0)}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Y inici (cm)</label>
                  <input type="number" style={styles.input} value={y0Files}
                    onChange={e => setY0Files(parseInt(e.target.value)||0)}/>
                </div>
                <button style={styles.botoPrimari} onClick={afegirFiles}>⊞ Afegir files</button>
                <div style={{fontSize:'11px', color:'#aaa', marginTop:'6px'}}>
                  Files {filaInici}–{filaInici+numFiles-1}, pos 1–{numPosicions}
                </div>
              </div>
            )}

            {mode !== 'files' && (
              <div>
                {zonesSeleccionades.length > 0 ? (
                  <div>
                    <div style={styles.seccio}>
                      {zonesSeleccionades.length === 1 ? 'Zona seleccionada' : `${zonesSeleccionades.length} zones`}
                    </div>
                    {zonesSeleccionades.length === 1 && (
                      <div style={styles.grup}>
                        <label style={styles.label}>Nom</label>
                        <input style={styles.input} value={nomZona}
                          onChange={e => setNomZona(e.target.value)}/>
                      </div>
                    )}
                    <div style={styles.grup}>
                      <label style={styles.label}>Tipus</label>
                      <select style={styles.input} value={tipusZona}
                        onChange={e => setTipusZona(e.target.value)}>
                        <option value="cultiu">Cultiu</option>
                        <option value="permanent">Permanent</option>
                        <option value="caminal">Caminal</option>
                        <option value="altres">Altres</option>
                      </select>
                    </div>
                    <div style={styles.grup}>
                      <label style={styles.label}>Color</label>
                      <div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>
                        {COLORS.map(c => (
                          <div key={c} onClick={() => setColorZona(c)}
                            style={{width:'22px', height:'22px', borderRadius:'4px', background:c,
                              border: colorZona===c?'2.5px solid #1D9E75':'1px solid rgba(0,0,0,0.15)',
                              cursor:'pointer'}}/>
                        ))}
                      </div>
                    </div>
                    <button style={styles.botoPrimari} onClick={actualitzarZonesSeleccionades}>
                      Actualitzar {zonesSeleccionades.length > 1 ? `${zonesSeleccionades.length} zones` : 'zona'}
                    </button>
                    <button style={{...styles.botoPrimari, background:'#e55', marginTop:'6px'}}
                      onClick={eliminarZonesSeleccionades}>
                      Eliminar {zonesSeleccionades.length > 1 ? `${zonesSeleccionades.length} zones` : 'zona'}
                    </button>
                    <button style={{...styles.botoPrimari, background:'#888', marginTop:'6px'}}
                      onClick={() => {
                        const nousPosicions = {...nomPosicions}
                        zonesSeleccionades.forEach(z => delete nousPosicions[z.id||z.tempId])
                        setNomPosicions(nousPosicions)
                      }}>
                      ↺ Centrar text
                    </button>
                    <button style={{...styles.botoPrimari, background:'#888', marginTop:'6px'}}
                      onClick={() => setZonesSeleccionades([])}>
                      Netejar selecció
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={styles.seccio}>Nova zona</div>
                    <div style={styles.grup}>
                      <label style={styles.label}>Nom</label>
                      <input style={styles.input} value={nomZona}
                        onChange={e => setNomZona(e.target.value)} placeholder="ex: Caseta"/>
                    </div>
                    <div style={styles.grup}>
                      <label style={styles.label}>Tipus</label>
                      <select style={styles.input} value={tipusZona}
                        onChange={e => setTipusZona(e.target.value)}>
                        <option value="cultiu">Cultiu</option>
                        <option value="permanent">Permanent</option>
                        <option value="caminal">Caminal</option>
                        <option value="altres">Altres</option>
                      </select>
                    </div>
                    <div style={styles.grup}>
                      <label style={styles.label}>Color</label>
                      <div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>
                        {COLORS.map(c => (
                          <div key={c} onClick={() => setColorZona(c)}
                            style={{width:'22px', height:'22px', borderRadius:'4px', background:c,
                              border: colorZona===c?'2.5px solid #1D9E75':'1px solid rgba(0,0,0,0.15)',
                              cursor:'pointer'}}/>
                        ))}
                      </div>
                    </div>
                    <div style={{fontSize:'11px', color:'#aaa', marginTop:'8px'}}>
                      Clica "Zona lliure" per dibuixar o "Afegir files" per generar automàticament
                    </div>
                  </div>
                )}

                <div style={{marginTop:'16px'}}>
                  <div style={styles.seccio}>
                    Zones ({zones.filter(z => !estaEliminada(z)).length})
                    {zonesAEliminar.length > 0 && (
                      <span style={{color:'#e55', marginLeft:'6px'}}>
                        · {zonesAEliminar.length} per eliminar
                      </span>
                    )}
                  </div>
                  <div style={{maxHeight:'200px', overflowY:'auto'}}>
                    {zones.filter(z => !estaEliminada(z)).map(z => (
                      <div key={z.id||z.tempId}
                        onClick={() => {
                          setZonesSeleccionades([z])
                          setNomZona(z.nom||z.codi||'')
                          setTipusZona(z.es_permanent?'permanent':'cultiu')
                          setColorZona(z.color||'#C0DD97')
                          setMode('select')
                        }}
                        style={{display:'flex', alignItems:'center', gap:'6px', padding:'5px 6px',
                          borderRadius:'5px', cursor:'pointer', marginBottom:'2px',
                          background: estaSeleccionada(z) ? '#E1F5EE' : 'transparent'}}>
                        <div style={{width:'10px',height:'10px',borderRadius:'2px',
                          background:z.color||'#ddd',flexShrink:0}}/>
                        <span style={{fontSize:'12px', color: estaSeleccionada(z)?'#0F6E56':'#333', flex:1}}>
                          {z.nom||z.codi}
                          {z.tempId && !z.id && <span style={{fontSize:'10px', color:'#1D9E75', marginLeft:'4px'}}>nou</span>}
                        </span>
                        {estaSeleccionada(z) && <span style={{fontSize:'11px', color:'#1D9E75'}}>✓</span>}
                        <span style={{fontSize:'10px',color:'#aaa'}}>
                          {z.es_permanent?'perm':'cultiu'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'99vw', height:'97vh', display:'flex', flexDirection:'column', overflow:'hidden' },
  cap: { padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:'12px', flexShrink:0 },
  titol: { fontSize:'15px', fontWeight:'600', color:'#333' },
  hint: { fontSize:'11px', color:'#888', marginTop:'2px' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999' },
  toolbar: { display:'flex', gap:'6px', padding:'8px 12px', borderBottom:'1px solid #eee', flexShrink:0, flexWrap:'wrap', alignItems:'center' },
  modeBtn: { padding:'6px 12px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', background:'white', color:'#666', fontSize:'13px' },
  modeBtnActiu: { background:'#1D9E75', color:'white', borderColor:'#1D9E75', fontWeight:'500' },
  botoAccio: { padding:'6px 14px', border:'none', borderRadius:'8px', cursor:'pointer', background:'#1D9E75', color:'white', fontSize:'13px', fontWeight:'500' },
  botoGuardar: { padding:'7px 18px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'500', fontSize:'13px' },
  cos: { flex:1, display:'flex', overflow:'auto' },
  canvasWrap: { flex:1, position:'relative', overflow:'auto' },
  posInfo: { position:'fixed', bottom:'16px', left:'220px', background:'rgba(0,0,0,0.7)', color:'white', padding:'5px 10px', borderRadius:'6px', fontSize:'12px', fontFamily:'monospace', pointerEvents:'none' },
  panell: { width:'210px', borderLeft:'1px solid #eee', padding:'12px', overflowY:'auto', flexShrink:0 },
  seccio: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' },
  grup: { marginBottom:'8px' },
  label: { display:'block', fontSize:'11px', color:'#888', marginBottom:'3px' },
  input: { width:'100%', padding:'6px 8px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' },
  botoPrimari: { width:'100%', padding:'8px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
}
