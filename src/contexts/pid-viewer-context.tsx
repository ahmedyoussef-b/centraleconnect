
'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface PidViewerContextType {
  showPid: (externalId: string) => void;
  hidePid: () => void;
  pidToShow: string | null;
}

const PidViewerContext = createContext<PidViewerContextType | undefined>(undefined);

export function PidViewerProvider({ children }: { children: ReactNode }) {
  const [pidToShow, setPidToShow] = useState<string | null>(null);

  const showPid = (externalId: string) => setPidToShow(externalId);
  const hidePid = () => setPidToShow(null);

  return (
    <PidViewerContext.Provider value={{ showPid, hidePid, pidToShow }}>
      {children}
    </PidViewerContext.Provider>
  );
}

export function usePidViewer() {
  const context = useContext(PidViewerContext);
  if (context === undefined) {
    throw new Error('usePidViewer must be used within a PidViewerProvider');
  }
  return context;
}
