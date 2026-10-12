import { Component } from 'react';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) console.error('Unexpected application rendering error', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="app-failure">
        <div className="panel failure-panel">
          <p className="eyebrow">AI Emergency Corridor</p>
          <h1>Dashboard could not be rendered</h1>
          <p>{this.state.error?.message || 'An unexpected interface error occurred.'}</p>
          <button type="button" className="button button-primary" onClick={() => window.location.reload()}>Reload dashboard</button>
        </div>
      </main>
    );
  }
}
