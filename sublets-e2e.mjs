import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const LISTER = 'lister@ucsd.edu';
const SEEKER = 'seeker@ucsd.edu';
const ADMIN = 'admin@ucsd.edu';
const PW = 'testpass123';
const TITLE = 'Test QA Listing - Studio near UCSD';

const log = (label, msg) => console.log(`  [${label}] ${msg}`);
const results = [];
const pass = (step) => { results.push({ step, ok: true }); console.log(`  PASS: ${step}`); };
const fail = (step, detail) => { results.push({ step, ok: false, detail }); console.error(`  FAIL: ${step}: ${detail}`); };

async function shot(pg, name) {
  const p = `/tmp/sq-${name}.png`;
  await pg.screenshot({ path: p }).catch(() => {});
  console.log(`  screenshot: ${p}`);
}

async function authUser(browser, email, role) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage();

  // Try signin first (account may exist from prior run)
  await pg.goto(BASE + '/login');
  await pg.waitForLoadState('networkidle');
  await pg.fill('input[name="email"]', email);
  await pg.fill('input[name="password"]', PW);
  await pg.locator('button[name="mode"][value="signin"]').click();
  // Next.js server action redirect is a client-side push; give it 5s to settle
  await pg.waitForTimeout(5000);
  await pg.waitForLoadState('networkidle', { timeout: 10000 });
  let url = pg.url();
  const errMsg = await pg.locator('[role="alert"]').first().textContent().catch(() => '');
  log(email, 'after signin -> ' + url + (errMsg ? ' | err: ' + errMsg.trim() : ''));

  // Signin failed — try signup on a fresh page load
  if (url.includes('/login')) {
    await pg.goto(BASE + '/login');
    await pg.waitForLoadState('networkidle');
    await pg.fill('input[name="email"]', email);
    await pg.fill('input[name="password"]', PW);
    await pg.locator('button[name="mode"][value="signup"]').click();
    await pg.waitForTimeout(5000);
    await pg.waitForLoadState('networkidle', { timeout: 10000 });
    url = pg.url();
    const errMsg2 = await pg.locator('[role="alert"]').first().textContent().catch(() => '');
    log(email, 'after signup -> ' + url + (errMsg2 ? ' | err: ' + errMsg2.trim() : ''));
  }

  if (url.includes('/onboarding')) {
    const displayName = email === LISTER ? 'QA Lister' : email === ADMIN ? 'QA Admin' : 'QA Seeker';
    await pg.fill('input[name="full_name"]', displayName);
    await pg.fill('input[name="major"]', 'Computer Science');
    await pg.fill('input[name="graduation_year"]', '2026');
    await pg.fill('textarea[name="bio"]', 'QA test account.');
    const roleInput = pg.locator('input[name="role"][value="' + role + '"]');
    if (await roleInput.count()) await roleInput.check();
    await pg.locator('button').filter({ hasText: /finish setting up profile/i }).click();
    await pg.waitForTimeout(5000);
    await pg.waitForLoadState('networkidle', { timeout: 10000 });
    url = pg.url();
    const onbErr = await pg.locator('[role="alert"]').first().textContent().catch(() => '');
    log(email, 'after onboarding -> ' + url + (onbErr ? ' | err: ' + onbErr.trim() : ''));
  }

  if (!url.includes('/explore') && !url.includes('/dashboard') && !url.includes('/onboarding')) {
    await pg.screenshot({ path: '/tmp/sq-auth-fail-' + email.split('@')[0] + '.png' }).catch(() => {});
    throw new Error('Bad URL after auth: ' + url);
  }
  // If onboarding submit didn't navigate, the profile was already created before
  // Try navigating to explore directly
  if (url.includes('/onboarding')) {
    await pg.goto(BASE + '/explore');
    await pg.waitForLoadState('networkidle', { timeout: 10000 });
    url = pg.url();
    log(email, 'after forced /explore nav -> ' + url);
    if (!url.includes('/explore') && !url.includes('/dashboard')) {
      throw new Error('Could not reach app after auth, at: ' + url);
    }
  }

  log(email, 'ready at ' + url);
  return pg;
}

let listerPage, seekerPage, adminPage;
let listingId, requestId;

const browser = await chromium.launch({ headless: true });

// Step 1
console.log('\n=== 1. Lister login ===');
try {
  listerPage = await authUser(browser, LISTER, 'lister');
  await shot(listerPage, '01-lister');
  pass('1. Lister login');
} catch (e) {
  fail('1. Lister login', e.message);
}

// Step 2
console.log('\n=== 2. Create and publish listing ===');
try {
  await listerPage.goto(BASE + '/listings/new');
  await listerPage.waitForLoadState('networkidle', { timeout: 15000 });
  if (!listerPage.url().includes('/listings/new')) {
    throw new Error('Redirected away: ' + listerPage.url());
  }

  await listerPage.fill('input[name="title"]', TITLE);
  await listerPage.selectOption('select[name="housing_type"]', 'studio');
  await listerPage.fill('textarea[name="description"]', 'Cozy studio near UCSD. Fully furnished. Quiet building.');
  await listerPage.fill('input[name="monthly_rent"]', '1500');
  await listerPage.selectOption('select[name="utilities_included"]', 'all_included');

  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() + 7);
  const end = new Date(now); end.setDate(end.getDate() + 90);
  const fmt = (d) => d.toISOString().split('T')[0];

  await listerPage.fill('input[name="available_start_date"]', fmt(start));
  await listerPage.fill('input[name="available_end_date"]', fmt(end));
  await listerPage.selectOption('select[name="lease_status"]', 'have_signed_lease');
  await listerPage.fill('input[name="neighborhood"]', 'La Jolla Village');
  await listerPage.fill('input[name="address_private"]', '1234 Test Lane Unit 5');
  await listerPage.fill('input[name="distance_to_campus"]', '10 min walk');
  await listerPage.fill('input[name="bedrooms"]', '0');
  await listerPage.fill('input[name="bathrooms"]', '1');

  await shot(listerPage, '02a-form');
  await listerPage.click('button[name="mode"][value="publish"]');
  // server action redirect needs time to settle (same as auth forms)
  await listerPage.waitForTimeout(5000);
  await listerPage.waitForLoadState('networkidle', { timeout: 15000 });

  const pu = listerPage.url();
  const m = pu.match(/\/listings\/([a-f0-9-]+)$/);
  if (!m) {
    const errText = await listerPage.locator('[role="alert"]').first().textContent().catch(() => '');
    throw new Error('URL: ' + pu + ' | error: ' + errText);
  }
  listingId = m[1];
  log('2', 'listing id = ' + listingId);
  await shot(listerPage, '02b-published');
  pass('2. Create and publish listing');
} catch (e) {
  fail('2. Create and publish listing', e.message);
  await shot(listerPage, '02-fail');
}

// Step 3
console.log('\n=== 3. Seeker login ===');
try {
  seekerPage = await authUser(browser, SEEKER, 'seeker');
  await shot(seekerPage, '03-seeker');
  pass('3. Seeker login');
} catch (e) {
  fail('3. Seeker login', e.message);
}

// Step 4
console.log('\n=== 4. Seeker finds listing on /explore ===');
try {
  await seekerPage.goto(BASE + '/explore');
  await seekerPage.waitForLoadState('networkidle', { timeout: 12000 });
  await seekerPage.waitForTimeout(500);
  const card = seekerPage.locator('article').filter({ hasText: TITLE }).first();
  const cardCount = await card.count();
  log('4', 'cards: ' + cardCount);
  // Capture listingId from the card link if step 2 didn't succeed
  if (!listingId && cardCount > 0) {
    const href = await card.locator('a').first().getAttribute('href').catch(() => null);
    const hm = href && href.match(/\/listings\/([a-f0-9-]+)/);
    if (hm) { listingId = hm[1]; log('4', 'captured listingId from card: ' + listingId); }
  }
  await shot(seekerPage, '04-explore');
  if (cardCount > 0) pass('4. Seeker finds listing on /explore');
  else fail('4. Seeker finds listing on /explore', 'Card not found');
} catch (e) {
  fail('4. Seeker finds listing on /explore', e.message);
  await shot(seekerPage, '04-fail');
}

// Step 5
console.log('\n=== 5. Seeker saves listing ===');
try {
  if (!listingId) throw new Error('no listingId');
  await seekerPage.goto(BASE + '/listings/' + listingId);
  await seekerPage.waitForSelector('h1', { timeout: 10000 });
  const saveBtn = seekerPage.locator('button').filter({ hasText: /^save$/i }).first();
  await saveBtn.waitFor({ timeout: 8000 });
  await saveBtn.click();
  await seekerPage.waitForTimeout(1200);
  await shot(seekerPage, '05a-clicked');
  await seekerPage.goto(BASE + '/saved');
  await seekerPage.waitForLoadState('networkidle', { timeout: 10000 });
  const savedCount = await seekerPage.locator('article').filter({ hasText: TITLE }).count();
  await shot(seekerPage, '05b-saved');
  if (savedCount > 0) pass('5. Seeker saves listing');
  else fail('5. Seeker saves listing', 'Not on /saved page');
} catch (e) {
  fail('5. Seeker saves listing', e.message);
  await shot(seekerPage, '05-fail');
}

// Step 6
console.log('\n=== 6. Seeker messages lister ===');
try {
  await seekerPage.goto(BASE + '/listings/' + listingId);
  await seekerPage.waitForSelector('h1', { timeout: 10000 });
  const msgBtn = seekerPage.locator('button').filter({ hasText: /^message$/i });
  await msgBtn.waitFor({ timeout: 8000 });
  await msgBtn.click();
  await seekerPage.waitForTimeout(5000);
  await seekerPage.waitForLoadState('networkidle', { timeout: 10000 });
  if (!seekerPage.url().includes('/messages/')) {
    throw new Error('Not in messages: ' + seekerPage.url());
  }
  const bodyField = seekerPage.locator('textarea[name="body"]');
  await bodyField.waitFor({ timeout: 8000 });
  await bodyField.fill('Hi! Is this studio still available for summer?');
  await seekerPage.click('button[type="submit"]');
  await seekerPage.waitForTimeout(2000);
  // Messages may be in various elements; check page content
  const pageHtml = await seekerPage.content();
  const msgFound = pageHtml.includes('Is this studio still available');
  await shot(seekerPage, '06-message');
  if (msgFound) pass('6. Seeker messages lister');
  else fail('6. Seeker messages lister', 'Message not found in page content');
} catch (e) {
  fail('6. Seeker messages lister', e.message);
  await shot(seekerPage, '06-fail');
}

// Step 7
console.log('\n=== 7. Seeker requests to sublet ===');
try {
  await seekerPage.goto(BASE + '/listings/' + listingId);
  await seekerPage.waitForSelector('h1', { timeout: 10000 });
  const reqBtn = seekerPage.locator('button').filter({ hasText: /request to sublet/i });
  await reqBtn.waitFor({ timeout: 8000 });
  await reqBtn.click();
  await seekerPage.waitForTimeout(600);

  const noteField = seekerPage.locator('textarea').first();
  if (await noteField.isVisible().catch(() => false)) {
    await noteField.fill('Very interested in this place!');
  }
  const sendBtn = seekerPage.locator('button').filter({ hasText: /send request/i });
  if (await sendBtn.count()) await sendBtn.click();

  // server action redirect needs time
  await seekerPage.waitForTimeout(5000);
  await seekerPage.waitForLoadState('networkidle', { timeout: 10000 });
  const ru = seekerPage.url();
  const rm = ru.match(/\/requests\/([a-f0-9-]+)/);
  if (!rm) throw new Error('Not on requests page: ' + ru);
  requestId = rm[1];
  log('7', 'requestId = ' + requestId);
  await shot(seekerPage, '07-request');
  pass('7. Seeker requests to sublet');
} catch (e) {
  fail('7. Seeker requests to sublet', e.message);
  await shot(seekerPage, '07-fail');
}

// Step 8
console.log('\n=== 8. Lister accepts request ===');
try {
  if (!requestId) throw new Error('no requestId');
  await listerPage.goto(BASE + '/requests/' + requestId);
  await listerPage.waitForLoadState('networkidle', { timeout: 12000 });
  await shot(listerPage, '08a-request');
  const acceptBtn = listerPage.locator('button').filter({ hasText: /^accept$/i });
  await acceptBtn.waitFor({ timeout: 8000 });
  await acceptBtn.click();
  await listerPage.waitForTimeout(5000);
  await listerPage.waitForLoadState('networkidle', { timeout: 10000 });
  const html = (await listerPage.content()).toLowerCase();
  const accepted = html.includes('accepted') || html.includes('checklist');
  await shot(listerPage, '08b-accepted');
  if (accepted) pass('8. Lister accepts request');
  else fail('8. Lister accepts request', 'Accepted state not visible');
} catch (e) {
  fail('8. Lister accepts request', e.message);
  await shot(listerPage, '08-fail');
}

// Checklist helper — only toggles items that appear "unchecked" (aria-checked=false or no checked indicator)
async function toggleChecklist(pg, label) {
  await pg.goto(BASE + '/requests/' + requestId);
  await pg.waitForLoadState('networkidle', { timeout: 12000 });
  await pg.waitForTimeout(600);
  const SKIP = /accept|decline|cancel|complet|report|save|message|request to|filter|reset|apply|sign out|analytic|moderat/i;
  const btns = await pg.locator('button[type="button"]').all();
  let toggled = 0;
  for (const b of btns) {
    if (await b.isDisabled().catch(() => true)) continue;
    const text = (await b.textContent().catch(() => '')).trim();
    if (SKIP.test(text)) continue;
    // Only click if not already pressed — checklist buttons use aria-pressed
    const ariaPressed = await b.getAttribute('aria-pressed').catch(() => null);
    if (ariaPressed === 'true') { log(label, 'skip already-pressed: ' + text.substring(0, 30)); continue; }
    await b.click().catch(() => {});
    // Wait for server action to complete
    await pg.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await pg.waitForTimeout(800);
    toggled++;
    if (toggled >= 7) break;
  }
  log(label, 'toggled ' + toggled);
  return toggled;
}

// Step 9a
console.log('\n=== 9a. Lister checklist ===');
try {
  const n = await toggleChecklist(listerPage, '9a');
  await shot(listerPage, '09a-lister');
  if (n > 0) pass('9a. Lister completes checklist');
  else fail('9a. Lister completes checklist', 'No toggles found');
} catch (e) {
  fail('9a. Lister completes checklist', e.message);
}

// Step 9b
console.log('\n=== 9b. Seeker checklist ===');
try {
  const n = await toggleChecklist(seekerPage, '9b');
  await shot(seekerPage, '09b-seeker');
  if (n > 0) pass('9b. Seeker completes checklist');
  else fail('9b. Seeker completes checklist', 'No toggles found');
} catch (e) {
  fail('9b. Seeker completes checklist', e.message);
}

// Step 10 (report first while listing is still published, then mark complete)
// Note: Step 13 (report) is done here before step 10 so the listing is still
// accessible to the seeker (RLS only allows reading published listings).
console.log('\n=== 13-pre. Seeker submits report (before listing is filled) ===');
try {
  await seekerPage.goto(BASE + '/listings/' + listingId);
  await seekerPage.waitForSelector('h1', { timeout: 10000 });
  const reportBtn = seekerPage.locator('button').filter({ hasText: /^report$/i });
  if (!await reportBtn.count()) throw new Error('Report button not found on published listing');
  await reportBtn.first().click();
  await seekerPage.waitForTimeout(600);
  await seekerPage.locator('select[name="reason"]').waitFor({ timeout: 6000 });
  await seekerPage.locator('select[name="reason"]').selectOption('inaccurate_listing');
  const details = seekerPage.locator('textarea[name="details"]');
  if (await details.isVisible().catch(() => false)) await details.fill('Description mismatch.');
  await seekerPage.locator('button').filter({ hasText: /submit report/i }).click();
  await seekerPage.waitForTimeout(5000);
  await seekerPage.waitForLoadState('networkidle', { timeout: 10000 });
  const confirmed = /report sent|submitted|thank/i.test(await seekerPage.content());
  await shot(seekerPage, '13-report');
  if (confirmed) pass('13. Seeker submits report');
  else fail('13. Seeker submits report', 'No confirmation after submit');
} catch (e) {
  fail('13. Seeker submits report', e.message);
  await shot(seekerPage, '13-fail');
}

// Step 10
console.log('\n=== 10. Lister marks complete ===');
try {
  await listerPage.goto(BASE + '/requests/' + requestId);
  await listerPage.waitForLoadState('networkidle', { timeout: 12000 });
  await shot(listerPage, '10a-before');
  let completeBtn = listerPage.locator('button').filter({ hasText: /mark sublet completed/i });
  if (!await completeBtn.count()) throw new Error('Button not found');
  const isDisabled = await completeBtn.isDisabled();
  log('10', 'disabled: ' + isDisabled);
  const stillDisabled = await completeBtn.isDisabled().catch(() => false);
  if (stillDisabled) {
    fail('10. Lister marks request complete', 'Button still disabled');
  } else {
    await completeBtn.click();
    await listerPage.waitForTimeout(5000);
    await listerPage.waitForLoadState('networkidle', { timeout: 10000 });
    const done = (await listerPage.content()).toLowerCase().includes('completed');
    await shot(listerPage, '10c-done');
    if (done) pass('10. Lister marks request complete');
    else fail('10. Lister marks request complete', '"completed" not on page');
  }
} catch (e) {
  fail('10. Lister marks request complete', e.message);
  await shot(listerPage, '10-fail');
}

// Step 11
console.log('\n=== 11. Dashboard shows Filled ===');
try {
  await listerPage.goto(BASE + '/dashboard');
  await listerPage.waitForLoadState('networkidle', { timeout: 12000 });
  const testRow = listerPage.locator('li, tr, [data-testid]').filter({ hasText: TITLE });
  const rowCount = await testRow.count();
  const rowHtml = rowCount > 0 ? await testRow.first().innerHTML().catch(() => '') : '';
  const filledInRow = /filled/i.test(rowHtml);
  const filledAnywhere = /filled/i.test(await listerPage.content());
  log('11', 'test listing row found: ' + rowCount + ', filled in row: ' + filledInRow);
  await shot(listerPage, '11-dashboard');
  if (filledInRow || (filledAnywhere && requestId)) pass('11. Listing shows Filled on dashboard');
  else fail('11. Listing shows Filled on dashboard', '"filled" not found near test listing');
} catch (e) {
  fail('11. Listing shows Filled on dashboard', e.message);
}

// Step 12
console.log('\n=== 12. Filled listing gone from /explore ===');
try {
  await seekerPage.goto(BASE + '/explore');
  await seekerPage.waitForLoadState('networkidle', { timeout: 12000 });
  await seekerPage.waitForTimeout(500);
  const html = await seekerPage.content();
  const idGone = !listingId || !html.includes(listingId);
  log('12', 'listingId gone from explore: ' + idGone);
  await shot(seekerPage, '12-explore');
  if (idGone) pass('12. Filled listing gone from /explore');
  else fail('12. Filled listing gone from /explore', 'Listing id still in explore page');
} catch (e) {
  fail('12. Filled listing gone from /explore', e.message);
}

// Step 14
console.log('\n=== 14. Admin resolves report ===');
try {
  try {
    adminPage = await authUser(browser, ADMIN, 'both');
  } catch (authErr) {
    throw new Error('Admin auth failed (' + authErr.message + '). Ensure admin@ucsd.edu exists with password testpass123 and is_admin=true. If the account exists with a different password, reset it in Supabase Dashboard -> Authentication -> Users.');
  }
  await adminPage.goto(BASE + '/admin');
  await adminPage.waitForLoadState('networkidle', { timeout: 12000 });
  const adminUrl = adminPage.url();
  log('14', '/admin -> ' + adminUrl);
  if (adminUrl.includes('/dashboard')) {
    fail('14. Admin resolves report', 'Not admin — run SQL to set is_admin=true for admin@ucsd.edu');
  } else {
    await shot(adminPage, '14a-admin');
    const resolveBtn = adminPage.locator('button').filter({ hasText: /^resolve$/i }).first();
    await resolveBtn.waitFor({ timeout: 10000 });
    await resolveBtn.click();
    await adminPage.waitForLoadState('networkidle', { timeout: 10000 });
    await adminPage.waitForTimeout(600);
    const resolved = (await adminPage.content()).toLowerCase().includes('resolved');
    await shot(adminPage, '14b-resolved');
    if (resolved) pass('14. Admin resolves report');
    else fail('14. Admin resolves report', '"resolved" not found');
  }
} catch (e) {
  fail('14. Admin resolves report', e.message);
  if (adminPage) await shot(adminPage, '14-fail');
}

// Step 15
console.log('\n=== 15. Admin analytics ===');
try {
  if (!adminPage) throw new Error('No admin page');
  await adminPage.goto(BASE + '/admin/analytics');
  await adminPage.waitForLoadState('networkidle', { timeout: 12000 });
  if (adminPage.url().includes('/dashboard')) throw new Error('Not admin');
  await shot(adminPage, '15-analytics');
  const nums = await adminPage.locator('.tabular-nums').allTextContents();
  log('15', 'metrics: [' + nums.join(', ') + ']');
  const positives = nums.map(v => parseFloat(v.replace(/[^0-9.]/g, ''))).filter(n => !isNaN(n) && n > 0).length;
  const sections = await adminPage.locator('h2').count();
  if (positives > 0 && sections >= 4) pass('15. Admin analytics reflects activity');
  else fail('15. Admin analytics reflects activity', 'metrics: [' + nums.join(', ') + ']');
} catch (e) {
  fail('15. Admin analytics reflects activity', e.message);
  if (adminPage) await shot(adminPage, '15-fail');
}

// Summary
console.log('\n\n=== RESULTS ===');
let passed = 0, failed = 0;
for (const r of results) {
  if (r.ok) { console.log('  PASS: ' + r.step); passed++; }
  else { console.error('  FAIL: ' + r.step + '\n       -> ' + r.detail); failed++; }
}
console.log('\n  ' + passed + ' passed / ' + failed + ' failed');
await browser.close();
process.exit(failed > 0 ? 1 : 0);
