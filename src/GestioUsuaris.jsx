import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function GestioUsuaris({ onTancar }) {
  const [usuaris, setUsuaris] = useState([])
  const [emailNou, setEmailNou] = useState('')
  const [nomNou, setNomNou] = useState('')
  const [guardant, setGuardant] = useState(false)
  const [missatge, setMissatge] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { carregaUsuaris() }, [])

  async function carregaUsuaris() {
    const { data } = await supabase
      .from('usuaris_autoritzats')
      .select('*')
      .order('email')
    setUsuaris(data || [])
  }

  async function afegirUsuari() {
    if (!emailNou.trim()) return
    setGuardant(true)
    setError('')
    setMissatge('')
    const { error } = await supabase
      .from('usuaris_autoritzats')
      .insert({ email: emailNou.toLowerCase().trim(), nom: nomNou || null })
    if (error) setError('Error: ja existeix o email incorrecte')
    else {
      setMissatge(`✅ ${emailNou} afegit! Ara pot registrar-se a l'app.`)
      setEmailNou('')
      setNomNou('')
      await carregaUsuaris()
    }
    setGuardant(false)
  }

  async function eliminarUsuari(email) {
    if (!confirm(`Eliminar accés a ${email}?`)) return
    await supabase.from('usuaris_autoritzats').delete().eq('email', email)
    await carregaUsuaris()
  }

  async function toggleAdmin(usuari) {
    await supabase
      .from('usuaris_autoritzats')
      .update({ es_admin: !usuari.es_admin })
      .eq('email', usuari.email)
    await carregaUsuaris()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={styles.titol}>👥 Gestió d'usuaris</div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

        <div style={styles.cos}>
          <div style={styles.seccio}>Afegir nou usuari</div>
          <div style={styles.formRow}>
            <div style={{flex:2}}>
              <label style={styles.label}>Email</label>
              <input style={styles.input} type="email" value={emailNou}
                onChange={e => setEmailNou(e.target.value)}
                placeholder="email@exemple.com"
                onKeyDown={e => e.key === 'Enter' && afegirUsuari()}/>
            </div>
            <div style={{flex:1}}>
              <label style={styles.label}>Nom (opcional)</label>
              <input style={styles.input} value={nomNou}
                onChange={e => setNomNou(e.target.value)}
                placeholder="Nom"/>
            </div>
            <div style={{alignSelf:'flex-end'}}>
              <button style={styles.boto} onClick={afegirUsuari} disabled={guardant}>
                {guardant ? '...' : 'Afegir'}
              </button>
            </div>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          {missatge && <div style={styles.ok}>{missatge}</div>}

          <div style={{...styles.seccio, marginTop:'24px'}}>
            Usuaris autoritzats ({usuaris.length})
          </div>
          <div style={styles.taula}>
            <div style={styles.taulaHeader}>
              <span style={{flex:2}}>Email</span>
              <span style={{flex:1}}>Nom</span>
              <span style={{width:'80px', textAlign:'center'}}>Admin</span>
              <span style={{width:'80px'}}></span>
            </div>
            {usuaris.map(u => (
              <div key={u.email} style={styles.taulaFila}>
                <span style={{flex:2, fontSize:'13px', color:'#333'}}>{u.email}</span>
                <span style={{flex:1, fontSize:'13px', color:'#666'}}>{u.nom || '—'}</span>
                <span style={{width:'80px', textAlign:'center'}}>
                  <button
                    style={{...styles.badge, ...(u.es_admin?styles.badgeAdmin:styles.badgeNormal)}}
                    onClick={() => toggleAdmin(u)}>
                    {u.es_admin ? '⭐ Admin' : 'Usuari'}
                  </button>
                </span>
                <span style={{width:'80px', textAlign:'right'}}>
                  {!u.es_admin && (
                    <button style={styles.botoEliminar} onClick={() => eliminarUsuari(u.email)}>
                      Eliminar
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div style={styles.infoBox}>
            <div style={styles.infoTitol}>Com funciona</div>
            <div style={styles.infoText}>
              Afegeix l'email de la persona aquí. Ella mateixa pot registrar-se a l'app amb aquell email i crear la seva contrasenya. Si elimines un usuari, ja no podrà iniciar sessió.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(700px, 97vw)', maxHeight:'85vh', display:'flex', flexDirection:'column' },
  cap: { padding:'14px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  titol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999' },
  cos: { padding:'20px', overflowY:'auto', flex:1 },
  seccio: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'12px' },
  formRow: { display:'flex', gap:'10px', alignItems:'flex-start', marginBottom:'12px' },
  label: { display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' },
  input: { width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' },
  boto: { padding:'8px 16px', background:'#1D9E75', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'500', whiteSpace:'nowrap' },
  error: { background:'#FEE', border:'1px solid #FCC', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', color:'#C33' },
  ok: { background:'#E1F5EE', border:'1px solid #9FE1CB', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', color:'#0F6E56' },
  taula: { border:'1px solid #eee', borderRadius:'8px', overflow:'hidden' },
  taulaHeader: { display:'flex', alignItems:'center', padding:'8px 12px', background:'#f8f7f4', borderBottom:'1px solid #eee', fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase' },
  taulaFila: { display:'flex', alignItems:'center', padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0' },
  badge: { padding:'3px 8px', borderRadius:'20px', fontSize:'11px', border:'none', cursor:'pointer', fontWeight:'500' },
  badgeAdmin: { background:'#FFF3CD', color:'#856404' },
  badgeNormal: { background:'#f0f0f0', color:'#666' },
  botoEliminar: { padding:'4px 10px', background:'white', color:'#e55', border:'1px solid #e55', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
  infoBox: { background:'#f8f7f4', border:'1px solid #eee', borderRadius:'8px', padding:'12px', marginTop:'20px' },
  infoTitol: { fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' },
  infoText: { fontSize:'12px', color:'#888', lineHeight:'1.5' },
}
