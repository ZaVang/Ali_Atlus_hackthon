// Shared demo session: providers plus the minimal view/fallback state shared
// by the two current surfaces (Connection Integrity and Try an itinerary).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getProviders, type Providers } from "../providers";

export type DemoView = "integrity" | "lab";

export interface DemoSession {
  /** Singleton providers — the only place the app obtains them. */
  providers: Providers;
  view: DemoView;
  switchView: (view: DemoView) => void;
  /** Set once any flight search had to fall back to labelled fixtures. */
  fallbackBanner: boolean;
  notifySearchFallback: () => void;
}

const DemoSessionContext = createContext<DemoSession | null>(null);

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const providers = useMemo(getProviders, []);
  const [view, setView] = useState<DemoView>("integrity");
  const [fallbackBanner, setFallbackBanner] = useState(false);

  const switchView = useCallback((next: DemoView) => {
    setView(next);
  }, []);

  const notifySearchFallback = useCallback(() => {
    setFallbackBanner(true);
  }, []);

  const session: DemoSession = {
    providers,
    view,
    switchView,
    fallbackBanner,
    notifySearchFallback,
  };

  return <DemoSessionContext.Provider value={session}>{children}</DemoSessionContext.Provider>;
}

export function useDemoSession(): DemoSession {
  const ctx = useContext(DemoSessionContext);
  if (!ctx) {
    throw new Error("useDemoSession must be used inside <DemoSessionProvider>");
  }
  return ctx;
}
