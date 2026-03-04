import { useState, useEffect } from 'react';

const getInitialOnlineStatus = () => {
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine;
};

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(getInitialOnlineStatus);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    showOfflineIndicator: !isOnline,
  };
}
