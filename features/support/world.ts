// features/support/world.ts
// Cucumber World — shared state for server BDD scenarios
import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';

export class AppWorld extends World {
  readonly apiBaseUrl: string;
  lastResponse: { status: number; body: unknown } = { status: 0, body: null };
  authToken: string | null = null;
  petId: string | null = null;
  claimCode: string | null = null;

  constructor(options: IWorldOptions) {
    super(options);
    this.apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
  }
}

setWorldConstructor(AppWorld);
export type World = AppWorld;
