import { createContext, useContext, type ReactNode } from "react";

const PrintModeContext = createContext(false);

export function PrintModeProvider({ children }: { children: ReactNode }) {
  return <PrintModeContext.Provider value={true}>{children}</PrintModeContext.Provider>;
}

export function usePrintMode(): boolean {
  return useContext(PrintModeContext);
}

export function LiveOnly({ children }: { children: ReactNode }) {
  return usePrintMode() ? null : <>{children}</>;
}

export function PrintOnly({ children }: { children: ReactNode }) {
  return usePrintMode() ? <>{children}</> : null;
}
