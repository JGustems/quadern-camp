import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabase'

export default function XatIA({ onTancar }) {
  const [missatges, setMissatges] = useState([
    {
      rol: 'assistant',
      text: 'Hola! Soc el teu assistent del quadern de camp. Pots preguntar-me coses com:\n\n• "Quant he gastat aquest any?"\n• "Quines zones tenen tomàquets ara?"\n• "Quan vaig plantar els calçots?"\n• "Quines tasques he fet aquest mes?"\n\nQuè vols saber?'
    }
  ])
  const [input, setInput] = useState('')
  const [carregant, setCarregant] = useState(false)
  const [context, setContext] = useState(null)
  const finalRef = useRef(null)

  useEffect(() => { carregaContext() }, [])
  useEffect(() => { finalRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [missatges])

  async function carregaContext() {
    const [pobles, camps, cultius, tasques, registres] = await Promise.all([
      supabase.from('pobles').select('id, nom'),
      supabase.from('camps').select('id, nom, poble_id'),
      supabase.from('cultius').select('id, nom'),
      supabase.from('tasques').select('id, nom'),
      supabase.from('registres').select('id, zona_id, data, quantitat, unitat, cost_ma_obra, cost_producte, nom_producte, notes, cultius(nom), varietats(nom), tasques(nom), zones(codi, camp_id)').order('data', { ascending: false }).limit(500),
    ])
    setContext({
      pobles: pobles.data || [],
      camps: camps.data || [],
      cultius: cultius.data || [],
      tasques: tasques.data || [],
      registres: registres.data || [],
    })
  }

  async function enviar() {
    if (!input.trim() || carregant) return
    const pregunta = input.trim()
    setInput('')
    setMissatges(prev => [...prev, { rol: 'user', text: pregunta }])
    setCarregant(true)

    try {
      const contextText = context ? `
Tens accés a les dades reals del quadern de camp:

POBLES: ${JSON.stringify(context.pobles)}
CAMPS: ${JSON.stringify(context.camps)}
CULTIUS: ${JSON.stringify(context.cultius)}
TASQUES: ${JSON.stringify(context.tasques)}
REGISTRES (últims 500): ${JSON.stringify(context.registres)}

La data d'avui és ${new Date().toLocaleDateString('ca-ES')}.
` : 'No hi ha dades disponibles encara.'

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `Ets un assistent agrícola especialitzat que ajuda a analitzar dades d'un quadern de camp català. 
Respon sempre en català, de manera clara i concisa.
Quan analitzes dades, sigues específic amb números i dates.
Si no tens prou dades per respondre, digues-ho clarament.
Formata les respostes de manera llegible, usant llistes quan calgui.

${contextText}`,
          message: pregunta
        })
      })

      const data = await response.json()
      const resposta = data.text || 'No he pogut generar una resposta.'
      setMissatges(prev => [...prev, { rol: 'assistant', text: resposta }])
    } catch (e) {
      setMissatges(prev => [...prev, { rol: 'assistant', text: 'Error en connectar amb la IA. Torna-ho a provar.' }])
    }
    setCarregant(false)
  }

  function formatText(text) {
    return text.split('\n').map((line, i) => (
      <span key={i}>{line}<br/></span>
    ))
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div>
            <div style={styles.titol}>🤖 Assistent del camp</div>
            <div style={styles.sub}>Fes preguntes sobre les teves dades</div>
          </div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

        <div style={styles.missatges}>
          {missatges.map((m, i) => (
            <div key={i} style={{...styles.missatge, ...(m.rol==='user'?styles.missatgeUser:styles.missatgeBot)}}>
              {m.rol === 'assistant' && <div style={styles.avatar}>🌱</div>}
              <div style={{...styles.bombolla, ...(m.rol==='user'?styles.bombollaUser:styles.bombollaBot)}}>
                {formatText(m.text)}
              </div>
            </div>
          ))}
          {carregant && (
            <div style={{...styles.missatge, ...styles.missatgeBot}}>
              <div style={styles.avatar}>🌱</div>
              <div style={{...styles.bombolla, ...styles.bombollaBot, color:'#aaa'}}>
                Analitzant les dades...
              </div>
            </div>
          )}
          <div ref={finalRef}/>
        </div>

        <div style={styles.peu}>
          <input
            style={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
            placeholder="Fes una pregunta sobre el teu camp..."
            disabled={carregant}
          />
          <button style={styles.boto} onClick={enviar} disabled={carregant || !input.trim()}>
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(620px, 97vw)', height:'85vh', display:'flex', flexDirection:'column' },
  cap: { padding:'14px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 },
  titol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  sub: { fontSize:'12px', color:'#888', marginTop:'2px' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999' },
  missatges: { flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px' },
  missatge: { display:'flex', gap:'8px', alignItems:'flex-start' },
  missatgeUser: { flexDirection:'row-reverse' },
  missatgeBot: { flexDirection:'row' },
  avatar: { fontSize:'20px', flexShrink:0, marginTop:'4px' },
  bombolla: { maxWidth:'80%', padding:'10px 14px', borderRadius:'12px', fontSize:'14px', lineHeight:'1.5' },
  bombollaUser: { background:'#1D9E75', color:'white', borderRadius:'12px 12px 4px 12px' },
  bombollaBot: { background:'#f0f0f0', color:'#333', borderRadius:'12px 12px 12px 4px' },
  peu: { padding:'12px 16px', borderTop:'1px solid #eee', display:'flex', gap:'8px', flexShrink:0 },
  input: { flex:1, padding:'10px 14px', border:'1px solid #ddd', borderRadius:'24px', fontSize:'14px', outline:'none' },
  boto: { padding:'10px 16px', background:'#1D9E75', color:'white', border:'none', borderRadius:'24px', cursor:'pointer', fontSize:'16px' },
}
