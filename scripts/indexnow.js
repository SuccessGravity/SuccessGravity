#!/usr/bin/env node
// IndexNow: tells Bing (and Yandex, Seznam, Naver) which pages changed, right after a deploy.
// ChatGPT search uses Bing's index, so new and edited pages reach AI search sooner.
// Same idea as BestLoanUSA/bizhigher scripts/indexnow.js.
//
// Usage: node scripts/indexnow.js <before-sha> <after-sha> [--dry-run] [--no-wait]
//   Run by .github/workflows/auto-merge-claude.yml (after the merge) and indexnow.yml (direct pushes).
//
// Which URLs: every changed <dir>/index.html that is in sitemap.xml (so noindex pages are never sent).
// Asset-only changes (CSS, JS, data) send nothing — page content didn't change.
// The key is the <32 hex>.txt file at the repo root, served at https://successgravity.com/<key>.txt.
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const HOST = 'successgravity.com';
const ORIGIN = 'https://' + HOST;
const args = process.argv.slice(2);
const [before, after] = args.filter((a) => !a.startsWith('--'));
const DRY = args.includes('--dry-run');
const NO_WAIT = args.includes('--no-wait');
const keyFile = fs.readdirSync(root).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) { console.error('IndexNow key file missing at repo root'); process.exit(1); }
const KEY = fs.readFileSync(path.join(root, keyFile), 'utf8').trim();

function changedFiles() {
  if (!before || /^0+$/.test(before)) return [];
  try {
    return execSync('git diff --name-only --diff-filter=AM ' + before + ' ' + (after || 'HEAD'), { cwd: root })
      .toString().split('\n').filter(Boolean);
  } catch (e) { console.error('git diff failed: ' + e.message); return []; }
}

const inSitemap = new Set([...fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const urls = [...new Set(changedFiles()
  .filter((f) => /(^|\/)index\.html$/.test(f))
  .map((f) => ORIGIN + '/' + f.replace(/index\.html$/, '')))]
  .filter((u) => inSitemap.has(u))
  .slice(0, 10000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitLive(list) {
  const deadline = Date.now() + 8 * 60 * 1000;
  for (const u of list) {
    for (;;) {
      const res = await fetch(u, { redirect: 'manual' }).catch(() => null);
      if (res && res.status === 200) break;
      if (Date.now() > deadline) throw new Error('deploy wait timed out: ' + u + ' (' + (res ? res.status : 'network error') + ')');
      await sleep(15000);
    }
  }
}

(async () => {
  if (!urls.length) { console.log('No changed pages to announce.'); return; }
  console.log('IndexNow: ' + urls.length + ' URL(s)\n  ' + urls.slice(0, 50).join('\n  ') + (urls.length > 50 ? '\n  …' : ''));
  if (DRY) { console.log('(dry run, nothing sent)'); return; }
  if (!NO_WAIT) {
    await sleep(120000); // GitHub Pages deploy; edited pages already return 200, so wait regardless
    await waitLive([ORIGIN + '/' + keyFile, ...urls.slice(0, 20)]);
  }
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: ORIGIN + '/' + keyFile, urlList: urls }),
  });
  console.log('IndexNow response: ' + res.status + ' ' + res.statusText);
  if (res.status !== 200 && res.status !== 202) { console.error(await res.text()); process.exit(1); }
})().catch((e) => { console.error(e.message); process.exit(1); });
