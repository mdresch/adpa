"use client";

import { createContext, useContext, type ReactNode } from "react";

/** When true, assistant messages render as full-width report canvas (GenUI workspace). */
const GenuiReportSurfaceContext = createContext(false);

export function GenuiReportSurfaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <GenuiReportSurfaceContext.Provider value={true}>
      {children}
    </GenuiReportSurfaceContext.Provider>
  );
}

export function useGenuiReportSurface(): boolean {
  return useContext(GenuiReportSurfaceContext);
}
