"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useJeongsanBuilderState } from "@/jeongsan/features/hooks/use-jeongsan-builder";

type JeongsanBuilderContextValue = ReturnType<typeof useJeongsanBuilderState>;

const JeongsanBuilderContext = createContext<JeongsanBuilderContextValue | null>(null);

export function JeongsanBuilderProvider({ children }: { children: ReactNode }) {
  const value = useJeongsanBuilderState();
  return <JeongsanBuilderContext.Provider value={value}>{children}</JeongsanBuilderContext.Provider>;
}

export function useJeongsanBuilder() {
  const context = useContext(JeongsanBuilderContext);
  if (!context) {
    throw new Error("useJeongsanBuilder는 JeongsanBuilderProvider 안에서만 사용할 수 있습니다.");
  }
  return context;
}
