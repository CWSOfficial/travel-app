import { useState, useEffect } from "react";

// Exact pricing per region (monthly / yearly)
// Annual = 20% off monthly × 12
const PRICING = {
  GBP: { symbol: "£", code: "GBP", monthly: 7.99,  yearly: 76.70 },
  USD: { symbol: "$", code: "USD", monthly: 9.99,  yearly: 95.99 },
  EUR: { symbol: "€", code: "EUR", monthly: 8.99,  yearly: 86.30 },
  INR: { symbol: "₹", code: "INR", monthly: 299,   yearly: 2870  },
};

// Fallback for unlisted currencies: derive from USD
export const BASE_MONTHLY_GBP = 7.99;

// Country → pricing tier
const CURRENCY_MAP = {
  // GBP
  GB: PRICING.GBP,
  // USD
  US: PRICING.USD,
  AU: { symbol: "A$",  code: "AUD", monthly: 15.99, yearly: 153.99 },
  CA: { symbol: "C$",  code: "CAD", monthly: 13.99, yearly: 134.99 },
  SG: { symbol: "S$",  code: "SGD", monthly: 13.99, yearly: 134.99 },
  AE: { symbol: "د.إ", code: "AED", monthly: 36.99, yearly: 355.99 },
  // INR tier — India & lower-cost markets
  IN: PRICING.INR,
  PK: { symbol: "₨",   code: "PKR", monthly: 2799,  yearly: 26899  },
  BD: { symbol: "৳",   code: "BDT", monthly: 1099,  yearly: 10549  },
  // EUR — Eurozone + nearby
  DE: PRICING.EUR, FR: PRICING.EUR, IT: PRICING.EUR, ES: PRICING.EUR,
  NL: PRICING.EUR, BE: PRICING.EUR, PT: PRICING.EUR, AT: PRICING.EUR,
  SE: PRICING.EUR, NO: PRICING.EUR, DK: PRICING.EUR, FI: PRICING.EUR,
  PL: PRICING.EUR, CH: PRICING.EUR, IE: PRICING.EUR, GR: PRICING.EUR,
  // Others
  ZA: { symbol: "R",   code: "ZAR", monthly: 184,   yearly: 1769   },
  NG: { symbol: "₦",   code: "NGN", monthly: 12999, yearly: 124799 },
  BR: { symbol: "R$",  code: "BRL", monthly: 49.99, yearly: 479.99 },
  MX: { symbol: "$",   code: "MXN", monthly: 174,   yearly: 1670   },
  JP: { symbol: "¥",   code: "JPY", monthly: 1480,  yearly: 14210  },
  CN: { symbol: "¥",   code: "CNY", monthly: 72,    yearly: 691    },
  KR: { symbol: "₩",   code: "KRW", monthly: 12900, yearly: 123900 },
  NZ: { symbol: "NZ$", code: "NZD", monthly: 16.99, yearly: 163.09 },
};

const DEFAULT_CURRENCY = CURRENCY_MAP.GB;

// Reverse geocode lat/lng → country code using open-meteo geocoding (no API key)
async function getCountryFromCoords(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json();
  return data?.address?.country_code?.toUpperCase() || null;
}

export function useCurrency() {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        // 1. Try GPS geolocation first
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 })
        );
        const countryCode = await getCountryFromCoords(
          pos.coords.latitude,
          pos.coords.longitude
        );
        if (!cancelled && countryCode && CURRENCY_MAP[countryCode]) {
          setCurrency(CURRENCY_MAP[countryCode]);
          return;
        }
      } catch {
        // GPS denied or timed out — fall back to IP
      }

      try {
        // 2. IP-based fallback
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        const cc = data?.country_code;
        if (!cancelled && cc && CURRENCY_MAP[cc]) {
          setCurrency(CURRENCY_MAP[cc]);
          return;
        }
      } catch {
        // Both failed — stay on default GBP
      }

      if (!cancelled) setCurrency(DEFAULT_CURRENCY);
    }

    detect().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const monthlyPrice = currency.monthly;
  const yearlyPrice = currency.yearly;
  const yearlyMonthly = +(yearlyPrice / 12).toFixed(2);
  const yearlySaving = +((monthlyPrice * 12) - yearlyPrice).toFixed(2);

  return {
    currency,
    loading,
    sym: currency.symbol,
    monthlyPrice,
    yearlyMonthly,
    yearlyPrice,
    yearlySaving,
  };
}