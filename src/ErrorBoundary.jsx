import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error capturat:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', flexDirection: 'column', gap: '16px',
          fontFamily: 'system-ui, sans-serif', background: '#f8f7f4'
        }}>
          <div style={{fontSize: '48px'}}>🌱</div>
          <div style={{fontSize: '18px', fontWeight: '600', color: '#333'}}>
            Alguna cosa ha anat malament
          </div>
          <div style={{fontSize: '14px', color: '#888', maxWidth: '400px', textAlign: 'center'}}>
            S'ha produït un error inesperat. Les teves dades estan segures.
          </div>
          <div style={{
            background: '#f0f0f0', padding: '8px 16px', borderRadius: '6px',
            fontSize: '12px', color: '#666', fontFamily: 'monospace',
            maxWidth: '500px', overflow: 'auto'
          }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '10px 24px', background: '#1D9E75', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500'
            }}>
            Tornar a intentar
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px', background: 'white', color: '#666',
              border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px'
            }}>
            Refresca la pàgina
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
