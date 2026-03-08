"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AppContextValue {
  isApp: boolean;
}

const AppContext = createContext<AppContextValue>({ isApp: false });

export function AppProvider({
  initialIsApp = false,
  children,
}: {
  initialIsApp?: boolean;
  children: React.ReactNode;
}) {
  const [isApp, setIsApp] = useState(initialIsApp);

  useEffect(() => {
    // client-side cleanup in case UA differs
    setIsApp(navigator.userAgent.toLowerCase().includes("app1212"));
  }, []);

  return <AppContext.Provider value={{ isApp }}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}