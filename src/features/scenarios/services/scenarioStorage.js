import { parseScenario, serializeScenario } from '../utils/scenarioSerializer';

export const AUTOSAVE_KEY = 'emergency-corridor.autosave.v1';
export const SAVED_SCENARIO_KEY = 'emergency-corridor.saved.v1';

export const readStoredScenario = (key = AUTOSAVE_KEY) => {
  try {
    const json = window.localStorage.getItem(key);
    return { scenario: json ? parseScenario(json) : null, error: null };
  } catch (error) { return { scenario: null, error: `Could not restore the saved scenario: ${error.message}` }; }
};

export const writeStoredScenario = (scenario, key = AUTOSAVE_KEY) => {
  try { window.localStorage.setItem(key, serializeScenario(scenario)); }
  catch (error) { throw new Error(`Could not save on this device. Storage may be full or unavailable. ${error.message}`); }
};

export const downloadJson = (filename, contents) => {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
