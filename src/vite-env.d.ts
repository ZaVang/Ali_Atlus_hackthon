/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLIGHT_PROVIDER?: string;
  readonly VITE_ATLAS_MODE?: string;
  readonly VITE_AGENT_PROVIDER?: string;
  readonly VITE_ENABLE_SANDBOX_SERVICING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
