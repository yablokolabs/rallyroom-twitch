import { test, expect } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
test('simulation: crew, late join, pause/resume, rescue and read-only overlay', async ({ page, context }) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByTestId('mode-label')).toHaveText('SIMULATION · LOCAL FIXTURES');
  await page.getByLabel('Local control key').fill('rallyroom-e2e-only-control-key');
  await page.getByRole('button',{name:'Unlock controls'}).click();
  await expect(page.getByText('Owner controls unlocked')).toBeVisible();
  await page.getByRole('button',{name:'New lobby'}).click();
  await page.getByRole('button',{name:'Add test crew'}).click();
  await expect(page.getByRole('button',{name:'Start mission'})).toBeEnabled();
  await page.getByRole('button',{name:'Start mission'}).click();
  await page.getByLabel('Test participant').selectOption('late-joiner');
  await page.getByRole('button',{name:'Send fixture'}).click();
  await expect(page.getByRole('status').last()).toContainText('joined:scout');
  await page.getByRole('button',{name:'Run automatic fixtures'}).click();
  await expect(page.getByRole('progressbar',{name:'Reveal the route'})).toHaveAttribute('aria-valuenow','1',{timeout:15000});
  await page.getByRole('button',{name:'Pause mission'}).click();
  const frozen=await page.getByTestId('countdown').textContent();await page.waitForTimeout(1500);await expect(page.getByTestId('countdown')).toHaveText(frozen!);
  await page.getByRole('button',{name:'Resume mission'}).click();
  await page.getByRole('button',{name:'Run automatic fixtures'}).click();
  mkdirSync('docs/evidence',{recursive:true});
  await page.screenshot({path:'docs/evidence/simulation-dashboard.png',fullPage:true});
  const overlay=await context.newPage();await overlay.setViewportSize({width:1920,height:1080});await overlay.goto('/overlay');
  await expect(overlay.getByTestId('mode-label')).toContainText('SIMULATION');expect(await overlay.getByRole('button').count()).toBe(0);
  await overlay.screenshot({path:'docs/evidence/simulation-overlay.png'});
  await expect(page.getByRole('heading',{name:'You brought them home.'})).toBeVisible({timeout:90000});
  await expect(overlay.getByRole('heading',{name:'You brought them home.'})).toBeVisible();
  await overlay.reload();await expect(overlay.getByRole('heading',{name:'You brought them home.'})).toBeVisible();
  await page.getByRole('button',{name:'View team recap'}).click();
  await expect(page.getByRole('progressbar',{name:'Power the beacon'})).toHaveAttribute('aria-valuenow','4');
  await overlay.screenshot({path:'docs/evidence/simulation-success.png'});
  expect(errors).toEqual([]);expect(await page.locator('footer').count()).toBe(0);
});
test('small screen and reduced motion remain usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await expect(page.getByTestId('mode-label')).toBeVisible();await expect(page.getByRole('button',{name:'Unlock controls'})).toBeVisible();
  const width=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));expect(width.document).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({path:'docs/evidence/simulation-mobile.png',fullPage:true});
  await page.goto('/overlay?compact=1');await page.setViewportSize({width:1280,height:720});await expect(page.getByTestId('mode-label')).toContainText('SIMULATION');
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);
  await page.screenshot({path:'docs/evidence/simulation-overlay-compact.png'});
});
test('development static server cannot read server-side secrets', async ({ request }) => {
  const directory = mkdtempSync(resolve('.data/e2e/private-fixture-'));
  const marker = 'rallyroom-private-boundary-fixture';
  writeFileSync(resolve(directory, 'token-fixture.txt'), marker, { mode: 0o600 });
  try {
    for (const path of ['/.env', `/@fs${resolve(directory, 'token-fixture.txt')}`, `/@fs${resolve(directory, 'missing-control-key')}`, `/@fs${resolve('apps/server/src/config.ts')}`, `/@fs${resolve('.data/e2e/rooms/simulation/room.jsonl')}`]) {
      const response = await request.get(path);
      expect([403,404], path).toContain(response.status());
      expect(await response.text()).not.toContain(marker);
    }
  } finally {
    rmSync(directory, { recursive: true });
  }
});
