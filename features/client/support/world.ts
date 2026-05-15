// features/client/support/world.ts
// Cucumber World — shared Playwright state for client BDD scenarios
import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from '@playwright/test';

export class ClientWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  readonly baseUrl: string;
  lastResponse: { status: number; body: unknown } = { status: 0, body: null };

  constructor(options: IWorldOptions) {
    super(options);
    this.baseUrl = process.env.VITE_BASE_URL ?? 'http://localhost:5173';
  }
}

setWorldConstructor(ClientWorld);
export type World = ClientWorld;
