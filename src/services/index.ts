import type { Api } from './contracts';
import { httpApi } from './http';
import { mockApi } from './mock';

export * from './contracts';

/** The single API instance used by hooks. Switch with VITE_API_MODE=mock|http. */
export const api: Api = import.meta.env.VITE_API_MODE === 'http' ? httpApi : mockApi;
