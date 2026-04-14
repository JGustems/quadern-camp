import { useEffect, useRef } from 'react'

const ESCALA = 0.25

export default function MapaCamp({ camp, zones, zonesSeleccionades, onToggleZona, onSeleccionaFila }) {
  const canvasRef = useRef(null)

  useEffect(() => { dibuixa() }, [zones, zonesSeleccionades])

  function estaSeleccionada(zona) {
    return zonesSeleccionades.some(z => z.id === zona.id)
  }

  function dibuixa() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (camp.zones_geojson) {
      const pts = camp.zones_geojson.points
      ctx.beginPath()
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x*ESCALA, p.y*ESCALA) : ctx.lineTo(p.x*ESCALA, p.y*ESCALA))
      ctx.closePath()
      ctx.fillStyle = '#f0ede8'
      ctx.fill()
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    zones.forEach(zona => dibuixaZona(ctx, zona))

    // Numeros de fila a l'esquerra
    const files = [...new Set(zones.filter(z => !z.es_permanent && z.fila).map(z => z.fila))]
    files.forEach(fila => {
      const row = 0
      const col = fila - 1
      const am = 150 * ESCALA
      const al = 80 * ESCALA
      const x0 = obtenirX0() + col * am
      const y0 = obtenirY0() + row * al
      ctx.fillStyle = '#1D9E75'
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`F${fila}`, x0 + am/2, y0 - 10)
    })
  }

  function dibuixaZona(ctx, zona) {
    const sel = estaSeleccionada(zona)
    if (zona.es_permanent && zona.forma_geojson) {
      dibuixaPoligon(ctx, zona, sel)
    } else if (!zona.es_permanent && zona.fila) {
      dibuixaRect(ctx, zona, sel)
    }
  }

  function dibuixaPoligon(ctx, zona, sel) {
    const pts = zona.forma_geojson.points
    ctx.beginPath()
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x*ESCALA, p.y*ESCALA) : ctx.lineTo(p.x*ESCALA, p.y*ESCALA))
    ctx.closePath()
    ctx.fillStyle = sel ? '#B5D4F4' : zona.color || '#ddd'
    ctx.fill()
    ctx.strokeStyle = sel ? '#1D9E75' : 'rgba(0,0,0,0.2)'
    ctx.lineWidth = sel ? 2.5 : 1
    ctx.stroke()
    const cx = pts.reduce((s,p) => s+p.x, 0) / pts.length * ESCALA
    const cy = pts.reduce((s,p) => s+p.y, 0) / pts.length * ESCALA
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.font = '500 11px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(zona.nom || zona.codi, cx, cy)
  }

  function dibuixaRect(ctx, zona, sel) {
    const col = zona.fila - 1
    const row = zona.posicio_inici - 1
    const am = 150 * ESCALA
    const al = 80 * ESCALA
    const x0 = obtenirX0() + col * am
    const y0 = obtenirY0() + row * al

    ctx.fillStyle = sel ? '#B5D4F4' : zona.color || '#e8e4de'
    ctx.fillRect(x0, y0, am-1, al-1)
    ctx.strokeStyle = sel ? '#1D9E75' : 'rgba(0,0,0,0.15)'
    ctx.lineWidth = sel ? 2 : 0.5
    ctx.strokeRect(x0, y0, am-1, al-1)

    ctx.fillStyle = sel ? '#042C53' : '#666'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(zona.codi, x0+am/2, y0+al/2)
  }

  function obtenirX0() {
    if (camp.nom === 'Camp de la Bassa') return 750 * ESCALA
    if (camp.nom === 'Hort') return 550 * ESCALA
    return 100 * ESCALA
  }

  function obtenirY0() {
    if (camp.nom === 'Camp de la Bassa') return 300 * ESCALA
    if (camp.nom === 'Hort') return 310 * ESCALA
    return 100 * ESCALA
  }

  function obtenirMida() {
    if (camp.nom === 'Camp de la Bassa') return { w:2800, h:1600 }
    if (camp.nom === 'Hort') return { w:2300, h:1000 }
    return { w:2300, h:1300 }
  }

  function puntDinsPoligon(px, py, pts) {
    let inside = false
    for (let i=0, j=pts.length-1; i<pts.length; j=i++) {
      const xi=pts[i].x, yi=pts[i].y, xj=pts[j].x, yj=pts[j].y
      if (((yi>py) !== (yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside
    }
    return inside
  }

  function handleClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / ESCALA
    const y = (e.clientY - rect.top) / ESCALA

    for (const zona of zones.filter(z => z.es_permanent && z.forma_geojson)) {
      if (puntDinsPoligon(x, y, zona.forma_geojson.points)) {
        onToggleZona(zona)
        return
      }
    }

    for (const zona of zones.filter(z => !z.es_permanent && z.fila)) {
      const col = zona.fila - 1
      const row = zona.posicio_inici - 1
      const am = 150
      const al = 80
      const x0 = obtenirX0() / ESCALA + col * am
      const y0 = obtenirY0() / ESCALA + row * al
      if (x >= x0 && x <= x0+am && y >= y0 && y <= y0+al) {
        onToggleZona(zona)
        return
      }
    }
  }

  const mida = obtenirMida()

  return (
    <div style={{width:'100%', height:'100%', overflow:'auto', padding:'16px'}}>
      <canvas
        ref={canvasRef}
        width={mida.w * ESCALA}
        height={mida.h * ESCALA}
        onClick={handleClick}
        style={{cursor:'pointer', borderRadius:'8px', border:'1px solid #ddd', display:'block'}}
      />
    </div>
  )
}
