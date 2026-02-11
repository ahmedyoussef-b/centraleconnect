'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

interface SyncContextType {
  pendingSyncCount: number;
  incrementPendingSyncCount: () => void;
  clearPendingSyncCount: () => void;
  setPendingSyncCount: (count: number) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'pendingSyncCount';

export function SyncProvider({ children }: { children: ReactNode }) {
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    try {
        const storedCount = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedCount) {
            setPendingSyncCount(parseInt(storedCount, 10));
        }
    } catch (e) {
        console.error("Could not read pending sync count from localStorage", e);
    }
  }, []);

  const updateCount = (newCount: number) => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, newCount.toString());
    } catch (e) {
        console.error("Could not save pending sync count to localStorage", e);
    }
    setPendingSyncCount(newCount);
  }

  const incrementPendingSyncCount = useCallback(() => {
    setPendingSyncCount(prev => {
        const newCount = prev + 1;
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, newCount.toString());
        } catch (e) {
            console.error("Could not save pending sync count to localStorage", e);
        }
        return newCount;
    });
  }, []);

  const clearPendingSyncCount = useCallback(() => {
    updateCount(0);
  }, []);

  const value = {
    pendingSyncCount,
    incrementPendingSyncCount,
    clearPendingSyncCount,
    setPendingSyncCount: updateCount,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
