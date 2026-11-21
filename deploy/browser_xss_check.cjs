/* Run the real employee incident page against the disposable demo stack. */
const fs = require('node:fs');
const { chromium } = require('playwright');

const apiBase = process.env.IITSM_API_URL || 'http://localhost:8080/api/v1';
const frontendBase = process.env.IITSM_FRONTEND_URL || 'http://localhost:3000';
const evidencePath = process.env.IITSM_BROWSER_EVIDENCE || '/tmp/iitsm-browser-xss.json';
const screenshotPath = process.env.IITSM_BROWSER_SCREENSHOT || '/tmp/iitsm-browser-xss.png';
const evidence = {
  checkedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || 'local',
  browser: 'Chromium (Playwright)',
  status: 'failed',
  checks: [],
};

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    throw new Error(`${method} ${path} returned ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  let browser;
  let page;
  try {
    const login = await api('/auth/login', {
      method: 'POST',
      body: { email: 'employee1@iitsm.demo', password: 'Demo@1234' },
    });
    const services = await api('/services', { token: login.accessToken });
    if (!Array.isArray(services) || services.length === 0) throw new Error('No active services in demo catalog');

    const marker = `xss-${Date.now()}`;
    const title = `<script>window.__iitsmXss.title = true</script> ${marker}`;
    const description = `<img src=x onerror="window.__iitsmXss.description = true"> ${marker} description remains text`;
    const comment = `<script>window.__iitsmXss.comment = true</script> ${marker} comment`;
    const incident = await api('/incidents', {
      method: 'POST',
      token: login.accessToken,
      body: {
        title,
        description,
        serviceId: services[0].id,
        impact: 2,
        urgency: 2,
        affectedUsers: 1,
        confirmNotDuplicate: true,
      },
    });
    if (!incident || !incident.id) throw new Error('Incident creation response did not include an id');
    await api(`/incidents/${incident.id}/comments`, {
      method: 'POST',
      token: login.accessToken,
      body: { body: comment, visibility: 'PUBLIC' },
    });
    evidence.incidentId = incident.id;

    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__iitsmXss = { title: false, description: false, comment: false };
    });
    page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(`${frontendBase}/login`, { waitUntil: 'domcontentloaded' });
    const loginForm = page.locator('form');
    await loginForm.locator('input[name="email"]').first().fill('employee1@iitsm.demo');
    await loginForm.locator('input[name="password"]').first().fill('Demo@1234');
    await loginForm.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/employee/home', { timeout: 30000 });
    await page.goto(`${frontendBase}/employee/incidents/${incident.id}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: title, exact: true }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByText(comment, { exact: true }).waitFor({ state: 'visible', timeout: 30000 });

    const rendered = await page.locator('body').innerText();
    const checks = [
      ['title is visible as literal text', rendered.includes(title)],
      ['description is visible as literal text', rendered.includes(description)],
      ['comment is visible as literal text', rendered.includes(comment)],
    ];
    for (const [name, passed] of checks) {
      evidence.checks.push({ name, result: passed ? 'PASS' : 'FAIL' });
      if (!passed) throw new Error(`Browser XSS check failed: ${name}`);
    }

    const executed = await page.evaluate(() => window.__iitsmXss);
    evidence.executionMarkers = executed;
    evidence.checks.push({ name: 'user-supplied markup did not execute', result: Object.values(executed).every((value) => value === false) ? 'PASS' : 'FAIL' });
    if (Object.values(executed).some(Boolean)) throw new Error(`User-supplied markup executed: ${JSON.stringify(executed)}`);
    if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join('; ')}`);

    await page.screenshot({ path: screenshotPath, fullPage: true });
    evidence.pageErrors = pageErrors;
    evidence.status = 'passed';
  } catch (error) {
    evidence.error = error instanceof Error ? error.message : String(error);
    if (page) {
      try { await page.screenshot({ path: screenshotPath, fullPage: true }); } catch { /* preserve the original failure */ }
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
