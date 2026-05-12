const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture ALL network responses
  page.on('response', async resp => {
    const url = resp.url();
    if (!resp.ok()) {
      let body = '';
      try { body = await resp.text(); } catch {}
      console.log(`FAIL ${resp.status()} ${url}`);
      if (body) console.log('  Body:', body.substring(0, 300));
    }
    if (url.includes('/api/magic')) {
      let body = '';
      try { body = await resp.text(); } catch {}
      console.log(`MAGIC API ${resp.status()} ${url}`);
      if (body) console.log('  Response:', body.substring(0, 1000));
    }
  });

  page.on('console', msg => {
    if (['error', 'warn'].includes(msg.type())) {
      console.log(`CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });

  // Login
  await page.goto('https://swiftpackai.tech/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'mrityunjay@novajaytech.com');
  await page.fill('input[type="password"]', 'SwiftPack2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
  console.log('Logged in');

  // Handle beta modal
  const agreeBtn = await page.$('button:has-text("I Agree"), button:has-text("Accept"), button:has-text("Agree")');
  if (agreeBtn) { await agreeBtn.click(); await page.waitForTimeout(1000); }

  await page.waitForSelector('[data-testid="dashboard-title"]');

  // Fill form and submit
  await page.fill('[data-testid="url-input"]', 'https://example.com');
  await page.fill('[data-testid="product-name-input"]', 'TestProduct');
  await page.fill('[data-testid="target-audience-input"]', 'developers');
  await page.click('[data-testid="magic-button"]');
  console.log('\nMagic button clicked, waiting for results...\n');

  try {
    await page.waitForSelector('[data-testid="results-section"]', { timeout: 180000 });
    console.log('\n=== Results appeared ===');

    // Dump the full results HTML
    const resultsHtml = await page.$eval('[data-testid="results-section"]', el => el.innerHTML);
    console.log('Results HTML (truncated):', resultsHtml.substring(0, 3000));
  } catch (e) {
    console.log('ERROR: No results within 3 min');
    // Try to get toast
    const toasts = await page.$$eval('[data-sonner-toast], .sonner-toast, [role="status"]', els => els.map(e => e.textContent));
    console.log('Toasts:', toasts);
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Page text:', bodyText.substring(0, 1000));
  }

  await browser.close();
})();
