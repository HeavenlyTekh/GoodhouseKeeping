#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL = 'https://www.gsmarena.com';
const CACHE_DIR = path.join(__dirname, '..', 'data', 'devices');
const DELAY_MIN_MS = 2000;
const DELAY_MAX_MS = 5000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const http = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': USER_AGENT,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: BASE_URL + '/',
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function randomDelay() {
  return DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/** Normalize a slug or URL into a cache filename. */
function toSlug(input) {
  // Full URL: https://www.gsmarena.com/samsung_galaxy_s24_ultra-12771.php
  const urlMatch = input.match(/gsmarena\.com\/(.+?)(?:\?.*)?$/);
  let slug = urlMatch ? urlMatch[1] : input;
  slug = slug.replace(/\.php$/, '').replace(/[^a-z0-9_-]/gi, '_');
  return slug;
}

function cachePath(slug) {
  return path.join(CACHE_DIR, `${slug}.json`);
}

function readCache(slug) {
  const fp = cachePath(slug);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return null;
  }
}

function writeCache(slug, data) {
  ensureCacheDir();
  const fp = cachePath(slug);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Parser — extracts structured spec data from the GSMArena HTML
// ---------------------------------------------------------------------------
function parseSpecPage(html, url) {
  const $ = cheerio.load(html);

  // Device name
  const name =
    $('h1.specs-phone-name-title').text().trim() ||
    $('h1[data-spec="modelname"]').text().trim();

  // Quick highlight specs from the spotlight bar
  const released = $('[data-spec="released-hl"]').text().trim();
  const displaySizeHL = $('[data-spec="displaysize-hl"]').text().trim();
  const displayResHL = $('[data-spec="displayres-hl"]').text().trim();
  const cameraHL = $('[data-spec="camerapixels-hl"]').text().trim();
  const ramHL = $('[data-spec="ramsize-hl"]').text().trim();
  const chipsetHL = $('[data-spec="chipset-hl"]').text().trim();
  const batteryHL = $('[data-spec="batsize-hl"]').text().trim();

  // Detailed specs from the #specs-list table rows
  function specVal(key) {
    const el = $(`td.nfo[data-spec="${key}"]`);
    if (!el.length) return '';
    return el.text().replace(/\u00a0/g, ' ').trim();
  }

  // Parse the specs table into a map of section -> rows
  const sections = {};
  $('#specs-list > table').each((_, table) => {
    const heading = $(table).find('th').first().text().trim();
    const rows = [];
    $(table).find('tr').each((__, tr) => {
      const ttl = $(tr).find('td.ttl').text().trim();
      const nfo = $(tr).find('td.nfo').text().replace(/\u00a0/g, ' ').trim();
      if (ttl && nfo) rows.push({ label: ttl, value: nfo });
    });
    if (heading) sections[heading] = rows;
  });

  const specs = {
    name,
    url,
    scrapedAt: new Date().toISOString(),

    // Launch
    releaseDate: specVal('year') || released,
    status: specVal('status'),

    // Body
    dimensions: specVal('dimensions'),
    weight: specVal('weight'),
    build: specVal('build'),
    sim: specVal('sim'),

    // Display
    display: {
      type: specVal('displaytype'),
      size: specVal('displaysize') || displaySizeHL,
      resolution: specVal('displayresolution') || displayResHL,
      protection: specVal('displayprotection'),
    },

    // Platform
    os: specVal('os'),
    chipset: specVal('chipset') || chipsetHL,
    cpu: specVal('cpu'),
    gpu: specVal('gpu'),

    // Memory
    cardSlot: specVal('memoryslot'),
    ramStorage: specVal('internalmemory'),

    // Main Camera
    camera: {
      modules: specVal('cam1modules'),
      features: specVal('cam1features'),
      video: specVal('cam1video'),
    },

    // Selfie Camera
    selfieCamera: {
      modules: specVal('cam2modules'),
      features: specVal('cam2features'),
      video: specVal('cam2video'),
    },

    // Battery
    battery: {
      type: specVal('batdescription1'),
      capacity: batteryHL,
    },

    // Connectivity
    wlan: specVal('wlan'),
    bluetooth: specVal('bluetooth'),
    gps: specVal('gps'),
    nfc: specVal('nfc'),
    usb: specVal('usb'),

    // Misc
    colors: specVal('colors'),
    price: specVal('price'),
    sensors: specVal('sensors'),

    // Raw sections for anything we didn't explicitly extract
    sections,
  };

  return specs;
}

// ---------------------------------------------------------------------------
// Queue — sequential scraping with random delays
// ---------------------------------------------------------------------------
class ScrapeQueue {
  constructor() {
    this._queue = [];
    this._running = false;
  }

  /** Add a scrape job. Returns a promise that resolves with the spec data. */
  add(urlOrSlug) {
    return new Promise((resolve, reject) => {
      this._queue.push({ urlOrSlug, resolve, reject });
      this._drain();
    });
  }

  async _drain() {
    if (this._running) return;
    this._running = true;

    while (this._queue.length) {
      const job = this._queue.shift();
      try {
        const result = await scrapeDevice(job.urlOrSlug);
        job.resolve(result);
      } catch (err) {
        job.reject(err);
      }
      if (this._queue.length) {
        const delay = randomDelay();
        log(`  Waiting ${Math.round(delay / 1000)}s before next request...`);
        await sleep(delay);
      }
    }

    this._running = false;
  }
}

// ---------------------------------------------------------------------------
// Core scrape function
// ---------------------------------------------------------------------------
function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

/**
 * Scrape a device spec page.
 * @param {string} urlOrSlug - Full URL or GSMArena slug (e.g. "samsung_galaxy_s24_ultra-12771")
 * @param {object} [opts]
 * @param {boolean} [opts.forceRefresh=false] - Skip cache and re-scrape
 * @returns {Promise<object>} Parsed spec data
 */
async function scrapeDevice(urlOrSlug, opts = {}) {
  const forceRefresh = opts.forceRefresh || process.argv.includes('--force');
  const slug = toSlug(urlOrSlug);
  const url = urlOrSlug.startsWith('http')
    ? urlOrSlug
    : `${BASE_URL}/${urlOrSlug.replace(/\.php$/, '')}.php`;

  // 1. Check cache
  if (!forceRefresh) {
    const cached = readCache(slug);
    if (cached) {
      log(`Cache hit: ${slug}`);
      return cached;
    }
  } else {
    log(`Force refresh requested for ${slug}`);
  }

  // 2. Fetch the page
  log(`Fetching: ${url}`);
  let html;
  try {
    const resp = await http.get(url);
    html = resp.data;
  } catch (err) {
    const status = err.response ? err.response.status : 'network error';
    log(`Fetch failed (${status}): ${err.message}`);

    // Fall back to stale cache if available
    const stale = readCache(slug);
    if (stale) {
      log(`Falling back to stale cache for ${slug}`);
      return stale;
    }
    throw new Error(`Scrape failed and no cache available for ${slug}: ${err.message}`);
  }

  // 3. Parse
  const specs = parseSpecPage(html, url);

  if (!specs.name) {
    log(`Warning: Could not extract device name from ${url}`);
  }

  // 4. Cache
  writeCache(slug, specs);
  log(`Cached: ${slug} -> ${cachePath(slug)}`);

  return specs;
}

// ---------------------------------------------------------------------------
// Batch scrape helper — processes a list sequentially via the queue
// ---------------------------------------------------------------------------
async function scrapeBatch(urlsOrSlugs, opts = {}) {
  const queue = new ScrapeQueue();
  const results = [];

  for (const item of urlsOrSlugs) {
    try {
      const data = await queue.add(item);
      results.push({ slug: toSlug(item), data, error: null });
    } catch (err) {
      results.push({ slug: toSlug(item), data: null, error: err.message });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
async function main() {
  const rawArgs = process.argv.slice(2);
  const args = rawArgs.filter((a) => !a.startsWith('--'));

  // --list: show cached devices
  if (rawArgs.includes('--list')) {
    ensureCacheDir();
    const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
      console.log('No cached devices found.');
      return;
    }
    console.log(`Cached devices (${files.length}):\n`);
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
        console.log(`  ${f.replace('.json', '').padEnd(45)} ${data.name || '(unknown)'}`);
      } catch {
        console.log(`  ${f.replace('.json', '')} (corrupt)`);
      }
    }
    return;
  }

  if (args.length === 0) {
    console.log(`
GSMArena Device Scraper

Usage:
  node scrape.js <slug-or-url> [slug-or-url ...]   Scrape one or more devices
  node scrape.js --force <slug>                     Force re-scrape (ignore cache)
  node scrape.js --list                             List all cached devices

Examples:
  node scrape.js samsung_galaxy_s24_ultra-12771
  node scrape.js https://www.gsmarena.com/samsung_galaxy_s24_ultra-12771.php
  node scrape.js iphone_16_pro_max-12825 google_pixel_9_pro-12657
  node scrape.js --force samsung_galaxy_s24_ultra-12771
  node scrape.js --list
`);
    return;
  }

  const forceRefresh = process.argv.includes('--force');

  // Single device
  if (args.length === 1) {
    try {
      const result = await scrapeDevice(args[0], { forceRefresh });
      console.log('\n' + JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  // Multiple devices — sequential queue
  const results = await scrapeBatch(args, { forceRefresh });

  const ok = results.filter((r) => r.data);
  const fail = results.filter((r) => r.error);

  console.log(`\nDone. ${ok.length} scraped, ${fail.length} failed.`);
  if (fail.length) {
    console.log('Failed:');
    fail.forEach((f) => console.log(`  ${f.slug}: ${f.error}`));
  }
}

// ---------------------------------------------------------------------------
// Programmatic API (requireable)
// ---------------------------------------------------------------------------
module.exports = { scrapeDevice, scrapeBatch, parseSpecPage, toSlug };

// Run CLI when executed directly
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
