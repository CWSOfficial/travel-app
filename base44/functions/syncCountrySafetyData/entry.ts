import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ISO 3166-1 alpha-2 → gov.uk FCDO travel-advice URL slug
const COUNTRY_SLUGS = {
  AF: 'afghanistan', AL: 'albania', DZ: 'algeria', AD: 'andorra', AO: 'angola',
  AR: 'argentina', AM: 'armenia', AU: 'australia', AT: 'austria', AZ: 'azerbaijan',
  BH: 'bahrain', BD: 'bangladesh', BB: 'barbados', BY: 'belarus', BE: 'belgium',
  BZ: 'belize', BJ: 'benin', BT: 'bhutan', BO: 'bolivia', BA: 'bosnia-and-herzegovina',
  BW: 'botswana', BR: 'brazil', BN: 'brunei', BG: 'bulgaria', BF: 'burkina-faso',
  KH: 'cambodia', CM: 'cameroon', CA: 'canada', CV: 'cape-verde', TD: 'chad',
  CL: 'chile', CN: 'china', CO: 'colombia', KM: 'comoros', CR: 'costa-rica',
  HR: 'croatia', CU: 'cuba', CY: 'cyprus', CZ: 'czech-republic', DK: 'denmark',
  DJ: 'djibouti', DO: 'dominican-republic', EC: 'ecuador', EG: 'egypt', SV: 'el-salvador',
  EE: 'estonia', ET: 'ethiopia', FJ: 'fiji', FI: 'finland', FR: 'france',
  GA: 'gabon', GM: 'gambia', GE: 'georgia', DE: 'germany', GH: 'ghana',
  GR: 'greece', GD: 'grenada', GT: 'guatemala', GN: 'guinea', GY: 'guyana',
  HT: 'haiti', HN: 'honduras', HK: 'hong-kong', HU: 'hungary', IS: 'iceland',
  IN: 'india', ID: 'indonesia', IR: 'iran', IQ: 'iraq', IE: 'ireland',
  IL: 'israel-and-the-occupied-palestinian-territories', IT: 'italy', CI: 'ivory-coast',
  JM: 'jamaica', JP: 'japan', JO: 'jordan', KZ: 'kazakhstan', KE: 'kenya',
  KW: 'kuwait', KG: 'kyrgyzstan', LA: 'laos', LV: 'latvia', LB: 'lebanon',
  LS: 'lesotho', LR: 'liberia', LY: 'libya', LT: 'lithuania', LU: 'luxembourg',
  MO: 'macao', MG: 'madagascar', MW: 'malawi', MY: 'malaysia', MV: 'maldives',
  ML: 'mali', MT: 'malta', MR: 'mauritania', MU: 'mauritius', MX: 'mexico',
  MD: 'moldova', MN: 'mongolia', ME: 'montenegro', MA: 'morocco', MZ: 'mozambique',
  MM: 'myanmar', NA: 'namibia', NP: 'nepal', NL: 'netherlands', NZ: 'new-zealand',
  NI: 'nicaragua', NE: 'niger', NG: 'nigeria', MK: 'north-macedonia', NO: 'norway',
  OM: 'oman', PK: 'pakistan', PA: 'panama', PG: 'papua-new-guinea', PY: 'paraguay',
  PE: 'peru', PH: 'philippines', PL: 'poland', PT: 'portugal', QA: 'qatar',
  RO: 'romania', RU: 'russia', RW: 'rwanda', SA: 'saudi-arabia', SN: 'senegal',
  RS: 'serbia', SC: 'seychelles', SL: 'sierra-leone', SG: 'singapore', SK: 'slovakia',
  SI: 'slovenia', SO: 'somalia', ZA: 'south-africa', KR: 'south-korea', SS: 'south-sudan',
  LK: 'sri-lanka', SD: 'sudan', SR: 'suriname', SE: 'sweden', CH: 'switzerland',
  SY: 'syria', TW: 'taiwan', TJ: 'tajikistan', TZ: 'tanzania', TH: 'thailand',
  TL: 'timor-leste', TG: 'togo', TT: 'trinidad-and-tobago', TN: 'tunisia', TR: 'turkey',
  TM: 'turkmenistan', UG: 'uganda', UA: 'ukraine', AE: 'united-arab-emirates',
  GB: 'united-kingdom', US: 'usa', UY: 'uruguay', UZ: 'uzbekistan', VE: 'venezuela',
  VN: 'vietnam', YE: 'yemen', ZM: 'zambia', ZW: 'zimbabwe',
};

// Rough region mapping by country code prefix for fallback
function getRegion(cc) {
  const regionMap = {
    AF: 'Asia', AL: 'Europe', DZ: 'Africa', AD: 'Europe', AO: 'Africa',
    AR: 'South America', AM: 'Asia', AU: 'Oceania', AT: 'Europe', AZ: 'Asia',
  };
  // Simplified: use first letter ranges
  if (['DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CG','CI','DJ','EG','GQ','ER','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','SZ','TZ','TG','TN','UG','EH','ZM','ZW'].includes(cc)) return 'Africa';
  if (['AF','AM','AZ','BH','BD','BT','BN','KH','CN','CY','GE','IN','ID','IR','IQ','IL','JP','JO','KZ','KW','KG','LA','LB','MY','MV','MN','MM','NP','KP','OM','PK','PH','QA','SA','SG','KR','LK','SY','TW','TJ','TH','TL','TR','TM','AE','UZ','VN','YE'].includes(cc)) return 'Asia';
  if (['AL','AD','AT','BY','BE','BA','BG','HR','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','VA'].includes(cc)) return 'Europe';
  if (['AR','BO','BR','CL','CO','EC','GY','PY','PE','SR','UY','VE'].includes(cc)) return 'South America';
  if (['BZ','CR','SV','GT','HN','MX','NI','PA','US','CA'].includes(cc)) return 'North America';
  if (['AG','BS','BB','CU','DM','DO','GD','HT','JM','KN','LC','VC','TT'].includes(cc)) return 'Caribbean';
  if (['AU','FJ','KI','MH','FM','NR','NZ','PW','PG','WS','SB','TO','TV','VU'].includes(cc)) return 'Oceania';
  return '';
}

// Calculate a 1–100 safety index from the gov.uk alert_status and summary text
function calculateSafetyScore(alertStatus, summaryText) {
  let score = 85; // baseline for countries with FCDO pages (already notable enough to track)
  const text = (summaryText || '').toLowerCase();

  if (Array.isArray(alertStatus) && alertStatus.length > 0) {
    score -= alertStatus.length * 15;
  }
  if (/do not travel|against all travel|evacuate/i.test(text)) score -= 40;
  else if (/exercise increased caution|high risk|avoid non-essential/i.test(text)) score -= 20;
  else if (/exercise caution|be vigilant|remain vigilant/i.test(text)) score -= 10;

  return Math.max(1, Math.min(100, Math.round(score)));
}

function formatResponse(entry, weatherSummary) {
  return {
    metadata: {
      country: entry.country_name || '',
      region: entry.region || '',
      timestamp: entry.last_updated || new Date().toISOString(),
    },
    structured_metrics: {
      safety_score: entry.safety_index_score ?? 0,
      visa_free_days: entry.visa_free_days ?? 0,
    },
    unstructured_text: {
      weather_summary: weatherSummary || '',
      critical_advisories: entry.critical_advisories_text || '',
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { country_code } = body;
    if (!country_code) {
      return Response.json({ error: 'country_code is required' }, { status: 400 });
    }

    const cc = country_code.toUpperCase().trim();

    // ── 1. Check cache (24-hour TTL) — anonymous visitors can read cached rows ──
    const cached = await base44.asServiceRole.entities.DestinationSafetyCache.filter(
      { country_code: cc },
      '-last_updated',
      1
    );
    if (cached.length > 0) {
      const entry = cached[0];
      const age = Date.now() - new Date(entry.last_updated).getTime();
      if (age < CACHE_TTL_MS) {
        return Response.json({ ...formatResponse(entry, ''), cached: true });
      }
    }

    // ── 2. Cache miss/stale — require authentication before hitting the live API ──
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required to fetch live safety data' }, { status: 401 });

    // ── 3. Fetch fresh advisory data from UK FCDO gov.uk API ──
    const slug = COUNTRY_SLUGS[cc] || cc.toLowerCase();
    let countryName = cc;
    let region = getRegion(cc);
    let safetyScore = 50;
    let advisoryText = '';
    let advisoryData = {};
    let visaStatus = 'Check with the official embassy for visa requirements';
    let visaFreeDays = 0;

    try {
      const fcdoRes = await fetch(
        `https://www.gov.uk/api/content/foreign-travel-advice/${slug}`
      );
      if (fcdoRes.ok) {
        const fcdo = await fcdoRes.json();
        // Clean country name — gov.uk titles end with "travel advice"
        countryName = (fcdo.title || cc).replace(/\s+travel\s+advice$/i, '').trim();
        const description = fcdo.description || '';
        const alertStatus = fcdo.details?.alert_status || [];

        // Prefer the actual summary body; fall back to the meta description
        const summaryParts = fcdo.details?.parts || [];
        const summaryPart = summaryParts.find((p) => p.slug === 'summary');
        const summary = summaryPart?.body || fcdo.details?.summary || description;

        const changeDesc = fcdo.details?.change_description || '';

        advisoryData = { alert_status: alertStatus, source: 'UK FCDO gov.uk', slug, latest_change: changeDesc };
        // Combine the summary body with the latest FCDO change for the most timely advisory text
        const advisoryParts = [summary, changeDesc].filter((t) => t && t.trim());
        advisoryText = advisoryParts.join(' — ') || description || '';
        safetyScore = calculateSafetyScore(alertStatus, summary + ' ' + changeDesc);

        // Extract visa hints from the entry-requirements part or summary text
        const entryPart = summaryParts.find((p) => p.slug === 'entry-requirements');
        const visaText = ((entryPart?.body || '') + ' ' + (summary || description || '')).toLowerCase();
        if (/visa-free|visa free|no visa required|without a visa|do not need a visa/i.test(visaText)) {
          visaStatus = 'Visa-free entry for many nationalities — verify with embassy';
          visaFreeDays = 90;
        } else if (/e-visa|evisa|visa on arrival|visa-on-arrival|visa exemption/i.test(visaText)) {
          visaStatus = 'E-visa or visa-on-arrival available for many nationalities';
          visaFreeDays = 30;
        } else if (/visa required|must obtain a visa|need a visa/i.test(visaText)) {
          visaStatus = 'Visa required for most nationalities — apply before travel';
          visaFreeDays = 0;
        }
        // Append FCDO source disclosure — visa data reflects British passport holder guidance
        visaStatus += ' Entry requirements shown reflect UK FCDO guidance for British passport holders. Requirements differ by nationality — always verify with your embassy before booking.';
      } else {
        console.warn(`[syncCountrySafetyData] FCDO API returned ${fcdoRes.status} for slug: ${slug}`);
      }
    } catch (e) {
      console.warn('[syncCountrySafetyData] FCDO API fetch failed:', e.message);
    }

    // ── 4. Update cache ──
    const now = new Date().toISOString();
    const cacheEntry = {
      country_code: cc,
      country_name: countryName,
      region,
      visa_status: visaStatus,
      visa_free_days: visaFreeDays,
      safety_index_score: safetyScore,
      dynamic_advisories: advisoryData,
      critical_advisories_text: advisoryText,
      last_updated: now,
    };

    await base44.asServiceRole.entities.DestinationSafetyCache.deleteMany({ country_code: cc });
    await base44.asServiceRole.entities.DestinationSafetyCache.create(cacheEntry);

    return Response.json({ ...formatResponse(cacheEntry, ''), cached: false });
  } catch (error) {
    console.error('[syncCountrySafetyData] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});