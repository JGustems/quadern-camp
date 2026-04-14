import { useEffect, useRef } from 'react'

const ESCALA = 0.25

export default function MapaCamp({ camp, zones, zonaSeleccionada, onSeleccionaZona }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    dibuixa()
  }, [zones, zonaSeleccionada])

  function dibuixa() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Fons del camp
    if (camp.zones_geojson) {
      const perimetre = camp.zones_geojson
      ctx.beginPath()
      perimetre.points.forEach((p, i) => {
        const x = p.x * ESCALA
        const y = p.y * ESCALA
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
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
      const seleccionada = zonaSeleccionada?.id === zona.id
      dibuixaZona(ctx, zona, seleccionada)
    })
  }

  function dibuixaZona(ctx, zona, seleccionada) {
    if (zona.es_permanent && zona.forma_geojson) {
      dibuixaPoligon(ctx, zona, seleccionada)
    } else if (!zona.es_permanent && zona.fila) {
      dibuixaRect(ctx, zona, seleccionada)
    }
  }

  function dibuixaPoligon(ctx, zona, seleccionada) {
    const pts = zona.forma_geojson.points
    ctx.beginPath()
    pts.forEach((p, i) => {
      const x = p.x * ESCALA
      const y = p.y * ESCALA
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = zona.color || '#ddd'
    ctx.fill()
    ctx.strokeStyle = seleccionada ? '#1D9E75' : 'rgba(0,0,0,0.2)'
    ctx.lineWidth = seleccionada ? 2.5 : 1
    ctx.stroke()

    // Text centrat
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length * ESCALA
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length * ESCALA
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.font = '500 11px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(zona.nom || zona.codi, cx, cy)
  }

  function dibuixaRect(ctx, zona, seleccionada) {
    // Calcula posició a partir de fila i posicio
    const col = zona.fila - 1
    const row = zona.posicio_inici - 1
    const am = 150 * ESCALA
    const al = 80 * ESCALA

    // Offset base segons el camp
    const x0 = obtenirX0() + col * am
    const y0 = obtenirY0() + row * al

    ctx.fillStyle = seleccionada ? '#B5D4F4' : zona.color || '#e8e4de'
    ctx.fillRect(x0, y0, am - 1, al - 1)
    ctx.strokeStyle = seleccionada ? '#1D9E75' : 'rgba(0,0,0,0.15)'
    ctx.lineWidth = seleccionada ? 2 : 0.5
    ctx.strokeRect(x0, y0, am - 1, al - 1)

    ctx.fillStyle = seleccionada ? '#042C53' : '#666'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(zona.codi, x0 + am / 2, y0 + al / 2)
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

  function obtenirMidaCanvas() {
    if (camp.nom === 'Camp de la Bassa') return { w: 2800, h: 1600 }
    if (camp.nom === 'Hort') return { w: 2300, h: 1000 }
    return { w: 2300, h: 1300 }
  }

  function handleClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / ESCALA
    const y = (e.clientY - rect.top) / ESCALA

    // Comprova zones permanents (polígons)
    for (const zona of zones.filter(z => z.es_permanent && z.forma_geojson)) {
      if (puntDinsPoligon(x, y, zona.forma_geojson.points)) {
        onSeleccionaZona(zona)
        return
      }
    }

    // Comprova zones rectangulars
    for (const zona of zones.filter(z => !z.es_permanent && z.fila)) {
      const col = zona.fila - 1
      const row = zona.posicio_inici - 1
      const am = 150
      const al = 80
      const x0 = obtenirX0() / ESCALA + col * am
      const y0 = obtenirY0() / ESCALA + row * al
      if (x >= x0 && x <= x0 + am && y >= y0 && y <= y0 + al) {
        onSeleccionaZona(zona)
        return
      }
    }

    onSeleccionaZona(null)
  }

  function puntDinsPoligon(px, py, pts) {
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y
      const xj = pts[j].x, yj = pts[j].y
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    return inside
  }

  const mida = obtenirMidaCanvas()

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', padding: '16px' }}>
      <canvas
        ref={canvasRef}
        width={mida.w * ESCALA}
        height={mida.h * ESCALA}
        onClick={handleClick}
        style={{ cursor: 'pointer', borderRadius: '8px', border: '1px solid #ddd' }}
      />
    </div>
  )
}
