"use client";

import React, { createContext, useContext } from "react";

interface AppContextValue {
  isApp: boolean;
}

const AppContext = createContext<AppContextValue>({ isApp: false });

export function AppProvider({ isApp, children }: { isApp: boolean; children: React.ReactNode }) {
  return <AppContext.Provider value={{ isApp }}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}