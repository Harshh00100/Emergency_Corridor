import { AppStateProvider } from '../../state/AppStateContext';

export const AppProviders = ({ children }) => <AppStateProvider>{children}</AppStateProvider>;
