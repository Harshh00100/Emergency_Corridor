import { StatusBadge } from '../common/StatusBadge';
import { ConnectivityStatus } from '../feedback/ConnectivityStatus';

export const AppHeader = ({ activePage, onNavigate, onOpenProjectInfo }) => (
  <header className="app-header">
    <div className="brand-lockup">
      <div className="brand-mark" aria-hidden="true">EC</div>
      <div>
        <p className="eyebrow">Dispatch planning console</p>
        <h1>Emergency Corridor</h1>
      </div>
    </div>
    <div className="app-header-right">
      <nav className="app-nav" aria-label="Project pages">
        <button type="button" aria-current={activePage === 'dashboard' ? 'page' : undefined} className={`app-nav-link${activePage === 'dashboard' ? ' app-nav-link-active' : ''}`} onClick={() => onNavigate('dashboard')}>Dashboard</button>
        <button type="button" aria-current={activePage === 'how-it-works' ? 'page' : undefined} className={`app-nav-link${activePage === 'how-it-works' ? ' app-nav-link-active' : ''}`} onClick={() => onNavigate('how-it-works')}>How it works</button>
        <button type="button" aria-current={activePage === 'operator-guide' ? 'page' : undefined} className={`app-nav-link${activePage === 'operator-guide' ? ' app-nav-link-active' : ''}`} onClick={() => onNavigate('operator-guide')}>Operator guide</button>
        <button type="button" aria-current={activePage === 'data-and-safety' ? 'page' : undefined} className={`app-nav-link${activePage === 'data-and-safety' ? ' app-nav-link-active' : ''}`} onClick={() => onNavigate('data-and-safety')}>Data &amp; safety</button>
      </nav>
      <div className="header-actions">
        <ConnectivityStatus />
        <div className="header-session" aria-label="Session status"><span className="header-session-dot" aria-hidden="true" /><span>Session</span><strong>Active</strong></div>
        <StatusBadge tone="caution">DEMO MODE</StatusBadge>
        <button type="button" className="button button-secondary" onClick={onOpenProjectInfo}>Project information</button>
      </div>
    </div>
  </header>
);
