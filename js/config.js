'use strict';

// ═══════════════════════════════════════════
// CATEGORY CONFIG
// ═══════════════════════════════════════════
const CATS = {
  all:     {color:'#7B61FF',label:'ALL'},
  geo:     {color:'#FF2D55',label:'GEO'},
  military:{color:'#FF9F0A',label:'MIL'},
  finance: {color:'#FFD60A',label:'FIN'},
  climate: {color:'#30D158',label:'CLM'},
  tech:    {color:'#0A84FF',label:'TECH'},
};

// ═══════════════════════════════════════════
// API KEYS — defined in js/keys.js (gitignored)
// ═══════════════════════════════════════════
const NEWS_CACHE_KEY = 'meridian_news_cache_v5';
const NEWS_CACHE_TTL = 60 * 60 * 1000; // 60 minutes
const NEWS_MAX_AGE_MS = 48 * 3600 * 1000;

// ═══════════════════════════════════════════
// BROADCASTER CHANNELS
// ═══════════════════════════════════════════
const BROADCASTERS = [
  { id:'aljazeera', name:'AL JAZEERA',   handle:'AlJazeeraEnglish', channelId:'UCNye-wNBqNL5ZzHSJj3l8Bg', color:'#E8A020', cover:'MENA', desc:'Middle East · Africa · Asia-Pacific',  regions:['middle east','gulf','arab','africa','qatar','iraq','iran','syria','yemen','sudan','libya'],   cats:['geo','mil'],        lat:25.2854, lng:51.5310,  city:'DOHA'     },
  { id:'france24',  name:'FRANCE 24',    handle:'France24_en',      channelId:'UCQfwfsi5VrQ8yKZ-UWmAEFg', color:'#0066CC', cover:'FRA',  desc:'France · Africa · Europe',             regions:['france','africa','paris','europe','sahel','mali','niger','chad','senegal','algeria'],          cats:['geo','mil'],        lat:48.8738, lng:2.2950,   city:'PARIS'    },
  { id:'dw',        name:'DW NEWS',      handle:'DWNews',           channelId:'UCknLrEdhRCp1aegoMqRaCZg', color:'#C00000', cover:'DEU',  desc:'Germany · Europe · Global analysis',   regions:['germany','europe','berlin','brussels','ukraine','russia','nato'],                              cats:['geo','fin','tec'],  lat:52.5200, lng:13.4050,  city:'BERLIN'   },
  { id:'cbs',       name:'CBS NEWS',     handle:'CBSNews',           channelId:'UC8p1vwvWtl6T73JiExfWs1g', color:'#1C3F7A', cover:'USA',  desc:'US · 24/7 live news · Breaking coverage', regions:['us','united states','america','washington','new york','texas','california','white house','congress','nato'], cats:['geo','fin','mil'],  lat:40.7614, lng:-73.9776, city:'NEW YORK'      },
  { id:'bloomberg', name:'BLOOMBERG TV', handle:'Bloomberg',        channelId:'UCIALMKvObZNtJ6AmdCLP7Lg', color:'#2980b9', cover:'FIN',  desc:'Markets · Finance · Global business',   regions:['markets','finance','wall street','london','hong kong','tokyo','singapore','commodities'],       cats:['fin','tec','geo'],  lat:40.7527, lng:-73.9772, city:'NEW YORK'     },
];
const BROADCASTER_DEFAULT = 'aljazeera';

// ═══════════════════════════════════════════
// MARKET CONFIG
// ═══════════════════════════════════════════
const MARKET_CACHE_TTL = 5 * 60 * 1000;
const STOCK_WEIGHTS = {SPY:10,QQQ:9,AAPL:8,MSFT:8,NVDA:8,TSLA:7,AMZN:7,GOOGL:7,DIA:6,META:6};
const STOCK_TICKERS = Object.keys(STOCK_WEIGHTS);

// ═══════════════════════════════════════════
// ALL STATE VARIABLES
// Declaring ALL mutable state here prevents Temporal Dead Zone crashes
// when boot code runs before feature sections are parsed.
// ═══════════════════════════════════════════

// Globe + navigation
let G = null;
let activeCat = 'all';
let sidebarOpen = true;
let searchOpen = false;
let lastTod = null;
let lastHour = null;
let satModeOn = false;

// News + refresh
let nextRefreshAt = null;
let refreshCountdownInt = null;

// Feed + UI
let _lastFeedStories = [];
let _apStoryId = null;
let _tkrHash = '';

// Earthquake overlay
let EQ_DATA = [];
let eqVisible = false;

// Market data
let marketVisible = false;
let marketData = [];
let marketCacheTs = 0;
let _mktHash = '';

// Watchlist
let watchlist = JSON.parse(localStorage.getItem('meridian_wl') || '[]');
let watchlistFilter = false;

// Scrubber / timeline
const STORY_ARCHIVE = [];
let scrubLive = true;
let scrubPlayTimer = null;

// Analyst mode
let analystAssets = [];       // story IDs + geo keys
let _analystGeoMap = {};      // key → geo asset object (cities, countries, bases)
let analystGraph = null;
let analystAnimId = null;
let _netZoom = 1, _netPanX = 0, _netPanY = 0;
let _netDrag = null;

// Wargame (D1)
let wargameActive = false;
let wargameArcs   = [];

// Daily brief + map key
let _briefContent = '';
let _mapKeyOpen = false;

// Arc management (unified)
let divergeArcs    = [];
let cascadeArcsArr = [];

// Supabase map layers
let CITY_DATA      = [];   // [{name, lat, lng, icon_type, strategic_tier, ...}]
let REGION_DATA    = [];   // [{name, lat, lng, threat_level, radius_km, ...}]
let COUNTRY_DATA   = [];   // [{iso2, name, lat, lng, nuclear_armed, conflict_active, ...}]
let citiesVisible   = false;
let countriesVisible = false;

// Flight overlay (C1)
let flightData     = [];
let flightsVisible = false;
let _flightTimer   = null;
let _flightInfoPanel = null;

// Cables overlay (B3)
let cablePaths     = [];   // [{pts:[[lng,lat],...], c1:'#hex'}]
let borderPaths    = [];   // country border lines from topojson.mesh (green/red)
let cablesVisible  = false;
let _cablesFetched = false;

// Divergence overlay (A2)
let divergenceVisible = false;

// Cascade overlay (A1)
let cascadeVisible = false;

// Silence overlay (A3)
let silenceVisible = false;
let _silenceAnomalies = [];

// Threat rings (B1)
let threatsVisible = false;

// Shipping overlay (C2)
let shippingVisible = false;
let _shippingWs     = null;
let _vesselCounts   = {};

// Sanctions overlay (C3)
let sanctionsVisible = false;

// Feature: Satellite (F1)
let _satBlobUrl = null;

// Feature: Live Broadcast (F2)
let _lnpActive = false;
let _lnpCurrentId = BROADCASTER_DEFAULT;
let _lnpContextStory = null;

// Feature: Webcam (F3)
let _webcamVisible = false;
let _webcamPanelEnabled = false;
let _currentWebcams = [];
