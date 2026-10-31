// Maps departure city keywords → currency code + symbol
const CITY_CURRENCY_MAP = [
  { keywords: ["london", "manchester", "birmingham", "edinburgh", "glasgow", "bristol", "uk", "united kingdom", "england", "scotland", "wales"], code: "GBP", symbol: "£", name: "British Pound" },
  { keywords: ["paris", "france", "berlin", "germany", "rome", "italy", "madrid", "spain", "amsterdam", "netherlands", "brussels", "belgium", "vienna", "austria", "lisbon", "portugal", "athens", "greece", "frankfurt", "munich", "milan", "barcelona", "zurich", "geneva", "switzerland"], code: "EUR", symbol: "€", name: "Euro" },
  { keywords: ["new york", "los angeles", "chicago", "houston", "miami", "san francisco", "dallas", "boston", "seattle", "denver", "atlanta", "phoenix", "las vegas", "usa", "united states", "america"], code: "USD", symbol: "$", name: "US Dollar" },
  { keywords: ["toronto", "vancouver", "montreal", "calgary", "ottawa", "canada"], code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { keywords: ["sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "australia"], code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { keywords: ["auckland", "wellington", "christchurch", "new zealand"], code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { keywords: ["dubai", "abu dhabi", "uae", "united arab emirates", "sharjah"], code: "AED", symbol: "AED", name: "UAE Dirham" },
  { keywords: ["singapore"], code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { keywords: ["tokyo", "osaka", "japan"], code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { keywords: ["beijing", "shanghai", "guangzhou", "shenzhen", "china"], code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { keywords: ["hong kong"], code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { keywords: ["mumbai", "delhi", "bangalore", "hyderabad", "chennai", "kolkata", "india"], code: "INR", symbol: "₹", name: "Indian Rupee" },
  { keywords: ["riyadh", "jeddah", "saudi", "ksa"], code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { keywords: ["johannesburg", "cape town", "durban", "south africa"], code: "ZAR", symbol: "R", name: "South African Rand" },
  { keywords: ["nairobi", "kenya"], code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { keywords: ["lagos", "abuja", "nigeria"], code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { keywords: ["sao paulo", "rio", "brazil", "brasil"], code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { keywords: ["mexico city", "cancun", "guadalajara", "mexico"], code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { keywords: ["bangkok", "thailand"], code: "THB", symbol: "฿", name: "Thai Baht" },
  { keywords: ["kuala lumpur", "malaysia"], code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { keywords: ["jakarta", "bali", "indonesia"], code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { keywords: ["seoul", "busan", "korea"], code: "KRW", symbol: "₩", name: "Korean Won" },
  { keywords: ["istanbul", "ankara", "turkey"], code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { keywords: ["moscow", "russia"], code: "RUB", symbol: "₽", name: "Russian Ruble" },
];

export function getCurrencyFromCity(city = "") {
  const lower = city.toLowerCase().trim();
  for (const entry of CITY_CURRENCY_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return entry;
    }
  }
  return { code: "USD", symbol: "$", name: "US Dollar" };
}