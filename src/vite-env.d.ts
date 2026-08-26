/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLIGHT_PROVIDER?: string;
  readonly VITE_AGENT_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
