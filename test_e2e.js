const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture all console errors and network failures
  const errors = [];
  const networkFails = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`);
  });
  page.on('response', resp => {
    if (!resp.ok() && resp.url().includes('/api/')) {
      networkFails.push(`API FAIL ${resp.status()}: ${resp.url()}`);
    }
  });

  console.log('\n=== STEP 1: Login page ===');
  await page.goto('https://swiftpackai.tech', { waitUntil: 'networkidle' });
  console.log('URL:', page.url());
  const title = await page.title();
  console.log('Title:', title);

  // Should redirect to login
  if (!page.url().includes('/login')) {
    console.log('ERROR: Did not redirect to /login');
    await browser.close();
    process.exit(1);
  }
  console.log('OK: Redirected to login');

  console.log('\n=== STEP 2: Login form ===');
  await page.fill('input[type="email"]', 'mrityunjay@novajaytech.com');
  await page.fill('input[type="password"]', 'SwiftPack2026!');

  // Check no dead register link
  const registerLink = await page.$('a[href*="register"], a[href="/register"]');
  if (registerLink) {
    console.log('ERROR: Dead register link still present!');
  } else {
    console.log('OK: No dead register link');
  }

  const inviteText = await page.$('text=invite-only');
  console.log(inviteText ? 'OK: Invite-only message shown' : 'WARN: Invite-only message not found');

  await page.click('button[type="submit"]');

  console.log('\n=== STEP 3: Post-login ===');
  try {
    // Wait for beta modal or dashboard
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
    console.log('OK: Logged in, URL:', page.url());
  } catch (e) {
    console.log('ERROR: Still on login after submit:', await page.content().then(c => c.substring(0, 500)));
    await browser.close();
    process.exit(1);
  }

  // Handle beta agreement modal if present
  const agreeBtn = await page.$('button:has-text("I Agree"), button:has-text("Accept"), button:has-text("agree")');
  if (agreeBtn) {
    console.log('OK: Beta agreement modal shown, accepting...');
    await agreeBtn.click();
    await page.waitForTimeout(1000);
  }

  console.log('\n=== STEP 4: Dashboard ===');
  await page.waitForSelector('[data-testid="dashboard-title"]', { timeout: 10000 });
  console.log('OK: Dashboard loaded');

  console.log('\n=== STEP 5: Magic Button - fill form ===');
  await page.fill('[data-testid="url-input"]', 'https://example.com');
  await page.fill('[data-testid="product-name-input"]', 'TestProduct');
  await page.fill('[data-testid="target-audience-input"]', 'developers');
  console.log('OK: Form filled');

  console.log('\n=== STEP 6: Trigger Magic Button ===');
  await page.click('[data-testid="magic-button"]');
  console.log('OK: Magic button clicked');

  // Watch for progress bar
  const progressBar = await page.waitForSelector('.bg-zinc-950\\/60', { timeout: 5000 }).catch(() => null);
  console.log(progressBar ? 'OK: Progress bar appeared' : 'WARN: Progress bar not visible');

  console.log('\n=== STEP 7: Wait for results (up to 3 min) ===');
  try {
    await page.waitForSelector('[data-testid="results-section"]', { timeout: 180000 });
    console.log('OK: Results section appeared!');

    // Check what's in results
    const adScript = await page.$('[data-testid="ad-script"]');
    const tutScript = await page.$('[data-testid="tutorial-script"]');
    const adVideo = await page.$('[data-testid="download-ad-video"]');
    const tutVideo = await page.$('[data-testid="download-tutorial-video"]');
    const poster1 = await page.$('[data-testid="download-poster-1"]');

    console.log('Ad script:', adScript ? 'OK' : 'MISSING');
    console.log('Tutorial script:', tutScript ? 'OK' : 'MISSING');
    console.log('Ad video download:', adVideo ? 'OK' : 'MISSING');
    console.log('Tutorial video download:', tutVideo ? 'OK' : 'MISSING');
    console.log('Poster 1:', poster1 ? 'OK' : 'MISSING');
  } catch (e) {
    console.log('ERROR: Results never appeared within 3 minutes');
    // Check for toast error
    const toast = await page.$('.sonner-toast, [data-sonner-toast]');
    if (toast) {
      const toastText = await toast.textContent();
      console.log('Toast message:', toastText);
    }
  }

  console.log('\n=== Network failures ===');
  if (networkFails.length === 0) {
    console.log('None');
  } else {
    networkFails.forEach(f => console.log(f));
  }

  console.log('\n=== Console errors ===');
  if (errors.length === 0) {
    console.log('None');
  } else {
    errors.forEach(e => console.log(e));
  }

  await browser.close();
})();
