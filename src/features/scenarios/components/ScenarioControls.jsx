import { useRef } from 'react';
import { useScenarios } from '../hooks/useScenarios';
import { ScenarioReplay } from './ScenarioReplay';

export const ScenarioControls = () => {
  const inputRef = useRef(null);
  const { state, persistence, savedScenario, busy, shareUrl, replayScenario, closeReplay, save, restore, startNew, exportScenario, exportSummary, importScenario, share, replay, setName, setOfflineMode } = useScenarios();
  return (
    <section className="panel control-section scenario-panel" aria-labelledby="scenario-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Workspace</p><h2 id="scenario-heading">Save and replay scenario</h2></div>
        <span className="section-note" role="status">{persistence.status === 'saved' ? 'Autosave active' : persistence.status === 'error' ? 'Autosave unavailable' : 'Autosave starting'}</span>
      </div>
      <label className="field-label" htmlFor="scenario-name">Scenario name
        <input id="scenario-name" className="text-input" value={state.scenarioName} maxLength="80" onChange={(event) => setName(event.target.value)} />
      </label>
      <p className="scenario-meta">{savedScenario ? `Last saved: ${new Date(savedScenario.savedAt).toLocaleString()}` : 'No named snapshot saved yet.'}</p>
      {state.restored && <p className="disclosure-text">Restored snapshot · saved data retained until endpoints change or you retry a service.</p>}
      {persistence.error && <p className="fallback-note" role="alert">{persistence.error}</p>}
      <div className="scenario-actions">
        <button type="button" className="button button-primary" onClick={save}>Save snapshot</button>
        <button type="button" className="button button-secondary" onClick={restore} disabled={!savedScenario}>Restore</button>
        <button type="button" className="button button-secondary" onClick={startNew}>New</button>
        <button type="button" className="button button-secondary" onClick={replay} disabled={!state.recording.length}>Replay recording</button>
        <button type="button" className="button button-secondary" onClick={share} disabled={busy}>Copy share link</button>
        <button type="button" className="button button-secondary" onClick={exportScenario}>Export JSON</button>
        <button type="button" className="button button-secondary" onClick={exportSummary}>Export summary</button>
        <button type="button" className="button button-secondary" onClick={() => inputRef.current?.click()} disabled={busy}>Import JSON</button>
        <input ref={inputRef} hidden type="file" aria-label="Import scenario file" accept="application/json,.json" onChange={(event) => { importScenario(event.target.files?.[0]); event.target.value = ''; }} />
      </div>
      {shareUrl && <label className="field-label share-link">Scenario share link<input className="text-input" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></label>}
      <label className="offline-toggle"><input type="checkbox" checked={state.offlineMode} onChange={(event) => setOfflineMode(event.target.checked)} />Offline demo mode</label>
      <p className="disclosure-text">Offline mode uses bundled sample data for new requests. Saved routes remain available. Map tiles need a connection.</p>
      <p className="disclosure-text">Scenarios stay in this browser unless you export or share them. Shared links include endpoints, routes, simulated events, history, and replay state.</p>
      {replayScenario && <ScenarioReplay scenario={replayScenario} onClose={closeReplay} />}
    </section>
  );
};
