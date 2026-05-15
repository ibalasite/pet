// features/client/support/hooks.ts
import { Before, After } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import type { ClientWorld } from './world';

Before(async function(this: ClientWorld) {
  this.browser = await chromium.launch({ headless: true });
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();
});

After(async function(this: ClientWorld) {
  if (this.browser) {
    await this.browser.close();
  }
});
