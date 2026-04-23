import { useEffect, useRef } from 'react'

export export default function MapaCamp({ camp, zones, zonesSeleccionades, onToggleZona, onSeleccionaFila, cultiusActius, dataConsulta, onCanviaData, modeMovil }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => { dibuixa() }, [zones, zonesSeleccionades, cultiusActius])

  function estaSeleccionada(zona) {
    return zonesSeleccionades.some(z => z.id === zona.id)
  }

  function getPts(zona) {
    if (zona.forma_geojson?.points) return zona.forma_geojson.points
    return []
  }

  function calcularBbox() {
    const tots = []
    if (camp.zones_geojson?.points) tots.push(...camp.zones_geojson.points)
    zones.forEach(z => tots.push(...getPts(z)))
    if (!tots.length) return { minX:0, minY:0, maxX:1000, maxY:700 }
    return {
      minX: Math.min(...tots.map(p=>p.x)) - 40,
      minY: Math.min(...tots.map(p=>p.y)) - 40,
      maxX: Math.max(...tots.map(p=>p.x)) + 40,
      maxY: Math.max(...tots.map(p=>p.y)) + 40,
    }
  }

  function calcularEscala(bbox, canvasW, canvasH) {
    const sx = canvasW / (bbox.maxX - bbox.minX)
    const sy = canvasH / (bbox.maxY - bbox.minY)
    return Math.min(sx, sy)
  }

  function toCanvas(x, y, bbox, escala) {
    return {
      cx: (x - bbox.minX) * escala,
      cy: (y - bbox.minY) * escala
    }
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
    const container = containerRef.current
    if (!canvas || !container) return

    const W = container.clientWidth - (modeMovil ? 8 : 32)
    const H = container.clientHeight - (modeMovil ? 20 : 80)
    canvas.width = W
    canvas.height = H

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,W,H)
    ctx.fillStyle = '#f8f7f4'
    ctx.fillRect(0,0,W,H)

    const bbox = calcularBbox()
    const escala = calcularEscala(bbox, W, H)

    // Perímetre del camp
    if (camp.zones_geojson?.points) {
      const pts = camp.zones_geojson.points
      ctx.beginPath()
      pts.forEach((p,i) => {
        const {cx,cy} = toCanvas(p.x,p.y,bbox,escala)
        i===0 ? ctx.moveTo(cx,cy) : ctx.lineTo(cx,cy)
      })
      ctx.closePath()
      ctx.fillStyle = '#f0ede8'
      ctx.fill()
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Zones
    zones.forEach(zona => {
      const pts = getPts(zona)
      if (!pts.length) return
      const sel = estaSeleccionada(zona)
      const cultiu = cultiusActius[zona.id]

      ctx.beginPath()
      pts.forEach((p,i) => {
        const {cx,cy} = toCanvas(p.x,p.y,bbox,escala)
        i===0 ? ctx.moveTo(cx,cy) : ctx.lineTo(cx,cy)
      })
      ctx.closePath()

      ctx.fillStyle = sel ? '#B5D4F4' : cultiu?.color || zona.color || '#e8e4de'
      ctx.fill()
      ctx.strokeStyle = sel ? '#1D9E75' : 'rgba(0,0,0,0.15)'
      ctx.lineWidth = sel ? 2 : 0.5
      ctx.stroke()

      const c = centroid(pts)
      const {cx,cy} = toCanvas(c.x,c.y,bbox,escala)

      if (!modeMovil) {
        if (cultiu?.nom && !sel) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'
          ctx.font = `bold ${Math.max(7, escala*10)}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(cultiu.nom, cx, cy)
        } else if (!cultiu && !sel) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)'
          ctx.font = `${Math.max(7, escala*9)}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(zona.codi, cx, cy)
        }
      }
    })
  }

  function getCanvasPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const cx = (e.clientX - rect.left) * scaleX
    const cy = (e.clientY - rect.top) * scaleY
    const bbox = calcularBbox()
    const escala = calcularEscala(bbox, canvas.width, canvas.height)
    return {
      x: cx / escala + bbox.minX,
      y: cy / escala + bbox.minY
    }
  }

  function handleClick(e) {
    const {x, y} = getCanvasPos(e)
    for (const zona of zones) {
      const pts = getPts(zona)
      if (pts.length && ptInPoly(x, y, pts)) {
        onToggleZona(zona)
        return
      }
    }
  }

  function cultiusUnics() {
    const vistos = {}
    Object.values(cultiusActius).forEach(c => {
      if (c.nom && !vistos[c.nom]) vistos[c.nom] = c.color
    })
    return vistos
  }

  const llegenda = cultiusUnics()

  return (
    <div ref={containerRef} style={{width:'100%', height:'100%', display:'flex', flexDirection:'column', padding:'16px', overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px', flexWrap:'wrap', flexShrink:0}}>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <label style={{fontSize:'12px', color:'#888', fontWeight:'500'}}>Veure estat del:</label>
          <input
            type="date"
            value={dataConsulta || ''}
            onChange={e => {
              const val = e.target.value
              if (val && val.length === 10) onCanviaData && onCanviaData(val)
              else if (!val) onCanviaData && onCanviaData('')
            }}
            onBlur={e => {
              if (e.target.value.length === 10 && typeof onCanviaData === 'function') onCanviaData(e.target.value)
            }}
            style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px'}}
          />
          {dataConsulta && (
            <button onClick={() => onCanviaData && onCanviaData('')}
              style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'12px', color:'#666', background:'white', cursor:'pointer'}}>
              Avui
            </button>
          )}
        </div>
        {Object.keys(llegenda).length > 0 && (
          <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
            {Object.entries(llegenda).map(([nom, color]) => (
              <div key={nom} style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'#555'}}>
                <div style={{width:'12px', height:'12px', borderRadius:'3px', background:color, border:'1px solid rgba(0,0,0,0.1)'}}/>
                {nom}
              </div>
            ))}
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{cursor:'pointer', borderRadius:'8px', border:'1px solid #ddd', display:'block', flex:1, width:'100%'}}
      />
    </div>
  )
}
