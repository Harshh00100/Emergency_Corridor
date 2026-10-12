import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { appReducer, initialState } from './appReducer';
import { ACTION_TYPES as TYPES } from './actionTypes';
import { createScenario, readShareUrl } from '../features/scenarios/utils/scenarioSerializer';
import { readStoredScenario, writeStoredScenario } from '../features/scenarios/services/scenarioStorage';

const AppStateContext = createContext(null);

const initialize = () => {
  const stored = readStoredScenario();
  const state = stored.scenario ? appReducer(initialState, { type: TYPES.LOAD_SCENARIO, payload: stored.scenario }) : initialState;
  return stored.error ? { ...state, notifications: [{ id: 'restore-error', tone: 'caution', title: 'Restore unavailable', message: stored.error }] } : state;
};

export const AppStateProvider = ({ children }) => {
  const [state, baseDispatch] = useReducer(appReducer, undefined, initialize);
  const [persistence, setPersistence] = useState({ status: 'pending', error: null });
  const latestState = useRef(state);
  latestState.current = state;
  const dispatch = useCallback((action) => baseDispatch({ ...action, meta: { timestamp: new Date().toISOString(), ...action.meta } }), []);

  useEffect(() => {
    let savedState;
    const flush = () => {
      const latest = latestState.current;
      if (latest === savedState) return;
      try {
        writeStoredScenario(createScenario(latest, latest.scenarioName));
        savedState = latest;
        setPersistence((previous) => previous.status === 'saved' ? previous : { status: 'saved', error: null });
      } catch (error) {
        setPersistence((previous) => previous.error === error.message ? previous : { status: 'error', error: error.message });
      }
    };
    // A fixed cadence still saves while simulation ticks arrive every 250 ms.
    const timer = window.setInterval(flush, 1500);
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    let generation = 0;
    const loadShared = async () => {
      const url = new URL(window.location.href);
      const encoded = url.hash.startsWith('#scenario=') ? url.hash.slice(10) : null;
      const current = ++generation;
      if (!encoded) return;
      try {
        const scenario = await readShareUrl(encoded);
        if (current !== generation) return;
        dispatch({ type: TYPES.LOAD_SCENARIO, payload: scenario });
        url.hash = 'dashboard';
        window.history.replaceState({}, '', url);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (error) {
        if (current === generation) dispatch({ type: TYPES.ADD_NOTIFICATION, payload: { tone: 'caution', title: 'Shared scenario unavailable', message: error.message } });
      }
    };
    loadShared();
    window.addEventListener('hashchange', loadShared);
    return () => { generation += 1; window.removeEventListener('hashchange', loadShared); };
  }, [dispatch]);

  const contextValue = useMemo(() => ({ state, dispatch, persistence }), [state, dispatch, persistence]);
  return <AppStateContext.Provider value={contextValue}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider.');
  return context;
};
