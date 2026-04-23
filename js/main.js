'use strict';

// ═══════════════════════════════════════════
// BOOT SEQUENCE
// ═══════════════════════════════════════════

// Loading screen message cycler
const LD_MSGS = [
  'ACQUIRING SIGNAL...',
  'LOADING GLOBE ASSETS...',
  'CALIBRATING COORDINATES...',
  'CONNECTING INTELLIGENCE FEEDS...',
  'ALL SYSTEMS NOMINAL.',
];
let li = 0;
const ldInt = setInterval(() => {
  if (li < LD_MSGS.length) document.getElementById('ld-st').textContent = LD_MSGS[li++];
  else clearInterval(ldInt);
}, 400);

// Dismiss loading screen regardless of globe success
setTimeout(() => {
  const el = document.getElementById('loading');
  if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 1000); }
}, 2400);

initDraggablePanels();
initStars();
tick();
applyTod(getTod());
lastTod = getTod();
lastHour = new Date().getHours();

try {
  initGlobe();
} catch (err) {
  console.error('Globe init failed:', err);
  document.getElementById('ld-st').textContent = 'GLOBE UNAVAILABLE — CHECK CONNECTION';
}

initTicker();
initScrubber();
renderFeed(NEWS);
renderSentiment(NEWS);
archiveCurrentStories();
updateAllGlobeElements();
applyMeaningfulArcs(NEWS);
// Render DMZ / disputed border lines after globe stabilizes (borders load separately)
setTimeout(() => { if (typeof refreshAllPaths === 'function') refreshAllPaths(); }, 2000);

// Fetch live news + supporting data after globe is ready
setTimeout(() => fetchNews(), 800);
setTimeout(() => fetchEarthquakes(), 2000);
// Bootstrap from Supabase server — seeds local cache with accumulated history
setTimeout(() => bootstrapFromSupabase(), 5000);

// Load Supabase map layers (cities + conflict regions)
setTimeout(async () => {
  try {
    const [cities, regions, countries] = await Promise.all([sbFetchCities(2), sbFetchRegions(), sbFetchCountries()]);
    if (cities.length)    { CITY_DATA    = cities;    }
    if (regions.length)   { REGION_DATA  = regions;   }
    if (countries.length) { COUNTRY_DATA = countries; }
    if (cities.length || regions.length || countries.length) updateAllGlobeElements();
    // Defer border rendering so it doesn't block the globe's initial paint
    setTimeout(() => initCountryBorders(), 500);
  } catch(e) { console.warn('[MERIDIAN] Map layer load failed:', e.message); }
}, 3000);
// Re-fetch market data every 5 minutes when panel is open
setInterval(() => { if (marketVisible) fetchMarketData(); }, 5 * 60 * 1000);
