import { useEffect, useState } from 'react';

export const ConnectivityStatus = () => {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return () => { window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler); };
  }, []);
  return <span className={`connectivity-status${online ? '' : ' connectivity-status-offline'}`} role="status"><span aria-hidden="true" />{online ? 'Online' : 'Offline · demo data available'}</span>;
};
