import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [missatge, setMissatge] = useState('')
  const [carregant, setCarregant] = useState(false)

  async function handleSubmit() {
    setError('')
    setMissatge('')
    setCarregant(true)

    if (mode === 'register') {
      // Comprovar si l'email està autoritzat
      const { data: autoritzat } = await supabase
        .from('usuaris_autoritzats')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (!autoritzat) {
        setError('Aquest email no està autoritzat. Contacta amb l\'administrador.')
        setCarregant(false)
        return
      }

      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError('Error al registrar-se: ' + error.message)
      else setMissatge('Compte creat! Ja pots iniciar sessió.')
    } else {
      // Comprovar si l'email està autoritzat abans de deixar entrar
      const { data: autoritzat } = await supabase
        .from('usuaris_autoritzats')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (!autoritzat) {
        setError('Aquest email no està autoritzat.')
        setCarregant(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email o contrasenya incorrectes')
      else onLogin(data.user)
    }
    setCarregant(false)
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>🌱 Quadern de Camp</div>
        <div style={styles.tabs}>
          <button style={{...styles.tab, ...(mode==='login'?styles.tabActiu:{})}}
            onClick={() => { setMode('login'); setError(''); setMissatge('') }}>
            Iniciar sessió
          </button>
          <button style={{...styles.tab, ...(mode==='register'?styles.tabActiu:{})}}
            onClick={() => { setMode('register'); setError(''); setMissatge('') }}>
            Registrar-se
          </button>
        </div>

        <div style={styles.grup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            style={styles.input}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="el-teu@email.com"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div style={styles.grup}>
          <label style={styles.label}>Contrasenya</label>
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="mínim 6 caràcters"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {missatge && <div style={styles.ok}>{missatge}</div>}

        <button style={styles.boto} onClick={handleSubmit} disabled={carregant}>
          {carregant ? 'Carregant...' : mode === 'login' ? 'Entrar' : 'Crear compte'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  wrap: { minHeight:'100vh', background:'#f8f7f4', display:'flex', alignItems:'center', justifyContent:'center' },
  card: { background:'white', borderRadius:'12px', padding:'32px', width:'360px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' },
  logo: { fontSize:'22px', fontWeight:'700', color:'#1D9E75', textAlign:'center', marginBottom:'24px' },
  tabs: { display:'flex', gap:'4px', marginBottom:'20px', background:'#f0f0f0', borderRadius:'8px', padding:'3px' },
  tab: { flex:1, padding:'8px', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'13px', background:'transparent', color:'#666' },
  tabActiu: { background:'white', color:'#1D9E75', fontWeight:'600', boxShadow:'0 1px 4px rgba(0,0,0,0.1)' },
  grup: { marginBottom:'14px' },
  label: { display:'block', fontSize:'12px', color:'#888', marginBottom:'5px', fontWeight:'500' },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box' },
  error: { background:'#FEE', border:'1px solid #FCC', borderRadius:'8px', padding:'10px', fontSize:'13px', color:'#C33', marginBottom:'12px' },
  ok: { background:'#E1F5EE', border:'1px solid #9FE1CB', borderRadius:'8px', padding:'10px', fontSize:'13px', color:'#0F6E56', marginBottom:'12px' },
  boto: { width:'100%', padding:'12px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer' },
}
