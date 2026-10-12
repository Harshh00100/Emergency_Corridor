import { useState } from 'react';
import { useAppState } from '../../../state/AppStateContext';
import { ACTION_TYPES as TYPES } from '../../../state/actionTypes';
import { createRunSummary, createScenario, createShareUrl, MAX_SCENARIO_BYTES, parseScenario, serializeScenario } from '../utils/scenarioSerializer';
import { downloadJson, SAVED_SCENARIO_KEY, readStoredScenario, writeStoredScenario } from '../services/scenarioStorage';

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'emergency-corridor-scenario';

export const useScenarios = () => {
  const { state, dispatch, persistence } = useAppState();
  const [savedScenario, setSavedScenario] = useState(() => readStoredScenario(SAVED_SCENARIO_KEY).scenario);
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [replayScenario, setReplayScenario] = useState(null);
  const notify = (tone, title, message) => dispatch({ type: TYPES.ADD_NOTIFICATION, payload: { tone, title, message } });
  const current = () => createScenario(state, state.scenarioName);
  const perform = (operation) => {
    try { operation(); } catch (error) { notify('caution', 'Scenario action unavailable', error.message); }
  };

  const save = () => perform(() => {
    const scenario = current();
    writeStoredScenario(scenario, SAVED_SCENARIO_KEY);
    setSavedScenario(scenario);
    notify('positive', 'Scenario saved', `${scenario.name || 'Untitled scenario'} is available after a refresh.`);
  });
  const restore = () => perform(() => {
    const result = readStoredScenario(SAVED_SCENARIO_KEY);
    if (!result.scenario) throw new Error(result.error || 'No saved snapshot is available.');
    dispatch({ type: TYPES.LOAD_SCENARIO, payload: result.scenario });
    setShareUrl('');
    notify('positive', 'Scenario restored', 'Saved routes and progress restored. Running simulations are paused for review.');
  });
  const startNew = () => {
    dispatch({ type: TYPES.NEW_SCENARIO });
    setShareUrl('');
    const url = new URL(window.location.href);
    if (url.hash.startsWith('#scenario=')) { url.hash = 'dashboard'; window.history.replaceState({}, '', url); }
  };
  const exportScenario = () => perform(() => {
    const scenario = current();
    downloadJson(`${slugify(scenario.name)}.json`, serializeScenario(scenario));
    notify('positive', 'Scenario exported', 'The snapshot, history, and replay recording were downloaded.');
  });
  const exportSummary = () => perform(() => {
    const scenario = current();
    downloadJson(`${slugify(scenario.name)}-summary.json`, JSON.stringify(createRunSummary(scenario), null, 2));
    notify('positive', 'Run summary exported', 'The route comparison and chronological event history were downloaded.');
  });
  const importScenario = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > MAX_SCENARIO_BYTES) throw new Error('Scenario files must be smaller than 2 MB.');
      const imported = parseScenario(await file.text());
      dispatch({ type: TYPES.LOAD_SCENARIO, payload: imported });
      setShareUrl('');
      notify('positive', 'Scenario imported', `${imported.name || 'Untitled scenario'} is ready for review. Use Save snapshot to keep a named copy.`);
    } catch (error) { notify('caution', 'Scenario import failed', error.message); }
    finally { setBusy(false); }
  };
  const share = async () => {
    setBusy(true);
    try {
      const url = await createShareUrl(current());
      setShareUrl(url);
      let copied = false;
      try { if (navigator.clipboard) { await navigator.clipboard.writeText(url); copied = true; } } catch { /* Manual copy is available below. */ }
      notify('positive', 'Share link ready', copied ? 'The scenario link was copied to the clipboard.' : 'Select and copy the link in the scenario panel.');
    } catch (error) { notify('caution', 'Share link unavailable', error.message); }
    finally { setBusy(false); }
  };
  const replay = () => perform(() => {
    const scenario = current();
    if (!scenario.recording.length) throw new Error('Load routes and run a simulation to record a replay.');
    dispatch({ type: TYPES.PAUSE_SIMULATION });
    setReplayScenario(scenario);
  });

  return { state, persistence, savedScenario, busy, shareUrl, replayScenario, closeReplay: () => setReplayScenario(null),
    save, restore, startNew, exportScenario, exportSummary, importScenario, share, replay,
    setName: (name) => dispatch({ type: TYPES.SET_SCENARIO_NAME, payload: name }),
    setOfflineMode: (value) => dispatch({ type: TYPES.SET_OFFLINE_MODE, payload: value }) };
};
