/// <reference types="vite/client" />

interface Window {
  APP_ID: string;
  StateStore: {
    save: (appId: string, key: string, value: unknown) => void;
    load: (appId: string, key: string, defaultValue?: unknown) => unknown;
  };
  TelemetryHub: {
    log: (appId: string, category: string, message: string, extra?: unknown) => void;
  };
  NexusPrefs?: {
    qualityProfile: () => { particleScale: number };
  };
  __NEXUS_LAB_READY__?: () => void;
  Forge?: {
    drivers: Record<string, unknown>;
    registerLLM: (name: string, driver: unknown) => void;
    chat: (opts: { modelList?: string[]; system?: string; prompt?: string }) => Promise<{ text: string }>;
  };
}
