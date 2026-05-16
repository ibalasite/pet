// features/support/world.ts
// Cucumber World — shared state for server BDD scenarios
import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';

export interface DbClient {
  seed(fixtures: Record<string, unknown[]>): Promise<void>;
  clean(): Promise<void>;
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface RedisClient {
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrank(key: string, member: string): Promise<number | null>;
  zrem(key: string, member: string): Promise<void>;
  flushdb(): Promise<void>;
}

export interface HttpClient {
  request(opts: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<{ status: number; body: unknown; headers: Record<string, string> }>;
}

export class AppWorld extends World {
  readonly apiBaseUrl: string;

  // Last HTTP response from an API call
  lastResponse: {
    status: number;
    body: unknown;
    headers: Record<string, string>;
  } = { status: 0, body: null, headers: {} };

  // Authentication state
  authToken: string | null = null;
  adminSessionCookie: string | null = null;

  // Domain entity IDs held across steps
  petId: string | null = null;
  claimId: string | null = null;
  claimCode: string | null = null;
  matchId: string | null = null;
  jobId: string | null = null;
  listingId: string | null = null;

  // Infrastructure clients (injected by BeforeAll hook)
  db!: DbClient;
  redis!: RedisClient;
  client!: HttpClient;

  constructor(options: IWorldOptions) {
    super(options);
    this.apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
  }
}

setWorldConstructor(AppWorld);
export type { World };
