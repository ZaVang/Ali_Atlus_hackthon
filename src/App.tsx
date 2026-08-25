// Product shell: top bar with view switch + provider mode badges.
import ItineraryLab from "./components/ItineraryLab";
import ConnectionIntegrityDemo from "./components/ConnectionIntegrityDemo";
import { DemoSessionProvider, useDemoSession } from "./state/session";

function Shell() {
  const { view, switchView, providers, fallbackBanner } = useDemoSession();

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <h1>Connection Integrity Agent</h1>
          <div className="view-tabs" role="tablist" aria-label="View switch">
            <button
              type="button"
              role="tab"
              aria-selected={view === "integrity"}
              className={`tab ${view === "integrity" ? "active" : ""}`.trim()}
              onClick={() => switchView("integrity")}
            >
              Connection Integrity
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "lab"}
              className={`tab ${view === "lab" ? "active" : ""}`.trim()}
              onClick={() => switchView("lab")}
            >
              Try an itinerary
            </button>
          </div>
          <span className="mode-badge">Flight: {providers.flights.source}</span>
          <span className="mode-badge">Agent: {providers.agent.source}</span>
        </div>
      </header>

      {fallbackBanner && (
        <div className="banner banner-warning" role="status">
          Flight search unavailable — running on labelled fixtures.
        </div>
      )}

      <main className="container">{view === "integrity" ? <ConnectionIntegrityDemo /> : <ItineraryLab />}</main>
    </>
  );
}

export default function App() {
  return (
    <DemoSessionProvider>
      <Shell />
    </DemoSessionProvider>
  );
}
