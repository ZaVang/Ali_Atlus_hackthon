// Type surface for server/logic.mjs so vite.config.ts (TypeScript) can
// import the shared handlers with editor/type support. The implementation
// lives in logic.mjs; this file only declares signatures.
import type { IncomingMessage, ServerResponse } from "node:http";

export type GetEnv = () => Record<string, string | undefined>;
export type ApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

export function createAtlasProxyHandler(getEnv: GetEnv): ApiHandler;
export function createAgentChatHandler(getEnv: GetEnv): ApiHandler;
export function createConnectionResearchHandler(getEnv: GetEnv): ApiHandler;
export function parseEnvFile(filePath: string): Record<string, string>;
export function loadServiceEnv(rootDir: string): Record<string, string | undefined>;
