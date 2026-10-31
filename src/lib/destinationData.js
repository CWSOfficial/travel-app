/**
 * Comprehensive global destination index with aliases and fuzzy-search support.
 * Used by LocationAutocomplete for destination and departure city search.
 */

// Alternative name → canonical name mapping
export const ALIASES = {
  "bombay": "Mumbai, India",
  "madras": "Chennai, India",
  "calcutta": "Kolkata, India",
  "peking": "Beijing, China",
  "saigon": "Ho Chi Minh City, Vietnam",
  "burma": "Myanmar",
  "ceylon": "Sri Lanka",
  "siam": "Thailand",
  "the maldives": "Maldives",
  "a&n islands": "Andaman & Nicobar Islands, India",
  "port blair": "Andaman & Nicobar Islands, India",
  "havelock island": "Andaman & Nicobar Islands, India",
  "neil island": "Andaman & Nicobar Islands, India",
  "andaman islands": "Andaman & Nicobar Islands, India",
  "nicobar": "Andaman & Nicobar Islands, India",
  "lakshadweep": "Lakshadweep Islands, India",
  "bora bora": "Bora Bora, French Polynesia 🇵🇫",
  "tahiti": "Tahiti, French Polynesia 🇵🇫",
  "moorea": "Moorea, French Polynesia 🇵🇫",
  "turks and caicos": "Turks & Caicos Islands 🇬🇧",
  "turks & caicos": "Turks & Caicos Islands 🇬🇧",
  "st barts": "Saint Barthélemy (St Barts), Caribbean",
  "sint maarten": "Sint Maarten / Saint Martin, Caribbean",
  "st kitts": "St Kitts and Nevis",
  "st lucia": "Saint Lucia, Caribbean",
  "st vincent": "St Vincent and the Grenadines",
  "antigua": "Antigua and Barbuda",
  "bvi": "British Virgin Islands 🇬🇧",
  "usvi": "US Virgin Islands 🇺🇸",
  "caymans": "Cayman Islands 🇬🇧",
  "zante": "Zakynthos, Greece",
  "corfu": "Corfu, Greece",
  "kefalonia": "Kefalonia, Greece",
  "crete": "Crete, Greece",
  "rhodes": "Rhodes, Greece",
  "santorini": "Santorini, Greece",
  "mykonos": "Mykonos, Greece",
  "ibiza": "Ibiza, Spain",
  "majorca": "Mallorca, Spain",
  "mallorca": "Mallorca, Spain",
  "menorca": "Menorca, Spain",
  "tenerife": "Tenerife, Canary Islands 🇪🇸",
  "gran canaria": "Gran Canaria, Canary Islands 🇪🇸",
  "lanzarote": "Lanzarote, Canary Islands 🇪🇸",
  "fuerteventura": "Fuerteventura, Canary Islands 🇪🇸",
  "madeira": "Madeira, Portugal 🇵🇹",
  "azores": "Azores, Portugal 🇵🇹",
  "faroe": "Faroe Islands, Denmark 🇫🇴",
  "faroes": "Faroe Islands, Denmark 🇫🇴",
  "greenland": "Greenland, Denmark 🇬🇱",
  "hong kong": "Hong Kong SAR, China 🇭🇰",
  "macau": "Macau SAR, China 🇲🇴",
  "taiwan": "Taiwan 🇹🇼",
  "gibraltar": "Gibraltar 🇬🇧",
  "isle of man": "Isle of Man 🇮🇲",
  "jersey": "Jersey, Channel Islands 🇯🇪",
  "guernsey": "Guernsey, Channel Islands 🇬🇬",
  "bermuda": "Bermuda 🇬🇧",
  "falkland islands": "Falkland Islands 🇬🇧",
  "zanzibar": "Zanzibar, Tanzania 🇹🇿",
  "nosy be": "Nosy Be, Madagascar",
  "raja ampat": "Raja Ampat, Indonesia",
  "komodo": "Komodo Island, Indonesia",
  "nusa penida": "Nusa Penida, Bali, Indonesia",
  "gili islands": "Gili Islands, Indonesia",
  "phu quoc": "Phu Quoc, Vietnam",
  "ha long bay": "Ha Long Bay, Vietnam",
  "siargao": "Siargao, Philippines",
  "palawan": "Palawan, Philippines",
  "boracay": "Boracay, Philippines",
  "langkawi": "Langkawi, Malaysia",
  "perhentian": "Perhentian Islands, Malaysia",
  "tioman": "Tioman Island, Malaysia",
  "koh lipe": "Koh Lipe, Thailand",
  "koh phangan": "Koh Phangan, Thailand",
  "koh tao": "Koh Tao, Thailand",
  "koh samui": "Koh Samui, Thailand",
  "orkney": "Orkney Islands, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "shetland": "Shetland Islands, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "hebrides": "Outer Hebrides, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "isles of scilly": "Isles of Scilly, England 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "isle of wight": "Isle of Wight, England 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "skye": "Isle of Skye, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "north goa": "North Goa, India",
  "south goa": "South Goa, India",
  "pondicherry": "Pondicherry, India",
  "puducherry": "Pondicherry, India",
  "spiti": "Spiti Valley, India",
  "zanskar": "Zanskar Valley, India",
  "chopta": "Chopta, Uttarakhand, India",
  "kutch": "Kutch, Gujarat, India",
  "daman": "Daman and Diu, India",
  "san marino": "San Marino 🇸🇲",
  "liechtenstein": "Liechtenstein 🇱🇮",
  "monaco": "Monaco 🇲🇨",
  "andorra": "Andorra 🇦🇩",
  "vatican": "Vatican City 🇻🇦",
};

// Full destination list — cities, islands, territories, regions
export const LOCATIONS = [
  // ── UK ──
  "London, United Kingdom","Birmingham, United Kingdom","Manchester, United Kingdom",
  "Edinburgh, United Kingdom","Glasgow, United Kingdom","Bristol, United Kingdom",
  "Leeds, United Kingdom","Liverpool, United Kingdom","Cardiff, United Kingdom",
  "Belfast, United Kingdom","Newcastle, United Kingdom","Sheffield, United Kingdom",
  "Bath, United Kingdom","Oxford, United Kingdom","Cambridge, United Kingdom",
  "York, United Kingdom","Brighton, United Kingdom","Nottingham, United Kingdom",
  // UK islands
  "Isle of Wight, England 🏴󠁧󠁢󠁥󠁮󠁧󠁿","Isles of Scilly, England 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Isle of Skye, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿","Orkney Islands, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Shetland Islands, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿","Outer Hebrides, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Isle of Arran, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿","Isle of Mull, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Islay, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Jersey, Channel Islands 🇯🇪","Guernsey, Channel Islands 🇬🇬","Isle of Man 🇮🇲",

  // ── USA ──
  "New York, USA","Los Angeles, USA","Chicago, USA","Houston, USA","Phoenix, USA",
  "Philadelphia, USA","San Antonio, USA","San Diego, USA","Dallas, USA",
  "San Jose, USA","Austin, USA","Jacksonville, USA","Miami, USA","Seattle, USA",
  "Denver, USA","Boston, USA","Nashville, USA","Las Vegas, USA",
  "Portland, USA","Atlanta, USA","Minneapolis, USA","Honolulu, USA",
  "San Francisco, USA","Washington DC, USA","New Orleans, USA","Salt Lake City, USA",

  // ── UAE ──
  "Dubai, UAE","Abu Dhabi, UAE","Sharjah, UAE","Ajman, UAE",

  // ── EUROPE ──
  "Paris, France","Lyon, France","Marseille, France","Nice, France","Bordeaux, France","Strasbourg, France",
  "Corsica, France 🇫🇷",
  "Berlin, Germany","Munich, Germany","Hamburg, Germany","Frankfurt, Germany","Cologne, Germany","Stuttgart, Germany",
  "Madrid, Spain","Barcelona, Spain","Seville, Spain","Valencia, Spain","Málaga, Spain","Bilbao, Spain",
  "Ibiza, Spain","Mallorca, Spain","Menorca, Spain","Formentera, Spain",
  "Tenerife, Canary Islands 🇪🇸","Gran Canaria, Canary Islands 🇪🇸","Lanzarote, Canary Islands 🇪🇸",
  "Fuerteventura, Canary Islands 🇪🇸","La Palma, Canary Islands 🇪🇸","La Gomera, Canary Islands 🇪🇸","El Hierro, Canary Islands 🇪🇸",
  "Rome, Italy","Milan, Italy","Naples, Italy","Venice, Italy","Florence, Italy","Bologna, Italy","Turin, Italy",
  "Sardinia, Italy","Sicily, Italy","Capri, Italy","Ischia, Italy","Procida, Italy",
  "Aeolian Islands, Italy","Pantelleria, Italy","Lampedusa, Italy",
  "Amsterdam, Netherlands","Rotterdam, Netherlands","The Hague, Netherlands",
  "Brussels, Belgium","Antwerp, Belgium",
  "Lisbon, Portugal","Porto, Portugal","Madeira, Portugal 🇵🇹",
  "Azores, Portugal 🇵🇹","São Miguel, Azores 🇵🇹","Terceira, Azores 🇵🇹","Faial, Azores 🇵🇹","Pico, Azores 🇵🇹",
  "Vienna, Austria","Graz, Austria","Salzburg, Austria","Innsbruck, Austria",
  "Zurich, Switzerland","Geneva, Switzerland","Bern, Switzerland","Lucerne, Switzerland","Interlaken, Switzerland",
  "Stockholm, Sweden","Gothenburg, Sweden","Malmö, Sweden",
  "Oslo, Norway","Bergen, Norway","Tromsø, Norway",
  "Copenhagen, Denmark","Aarhus, Denmark",
  "Faroe Islands, Denmark 🇫🇴",
  "Helsinki, Finland","Tampere, Finland","Rovaniemi, Finland",
  "Reykjavik, Iceland","Akureyri, Iceland",
  "Athens, Greece","Thessaloniki, Greece",
  "Santorini, Greece","Mykonos, Greece","Crete, Greece","Rhodes, Greece",
  "Corfu, Greece","Zakynthos, Greece","Kefalonia, Greece","Lefkada, Greece",
  "Paros, Greece","Naxos, Greece","Milos, Greece","Samos, Greece",
  "Lesbos, Greece","Chios, Greece","Skiathos, Greece","Skopelos, Greece","Hydra, Greece",
  "Prague, Czech Republic","Brno, Czech Republic",
  "Warsaw, Poland","Kraków, Poland","Wrocław, Poland","Gdańsk, Poland",
  "Budapest, Hungary",
  "Bucharest, Romania","Cluj-Napoca, Romania","Transylvania, Romania",
  "Sofia, Bulgaria","Varna, Bulgaria",
  "Zagreb, Croatia","Split, Croatia","Dubrovnik, Croatia","Hvar, Croatia","Korčula, Croatia",
  "Ljubljana, Slovenia","Bled, Slovenia",
  "Bratislava, Slovakia",
  "Riga, Latvia","Tallinn, Estonia","Vilnius, Lithuania",
  "Dublin, Ireland","Cork, Ireland","Galway, Ireland",
  "Valletta, Malta 🇲🇹","Gozo, Malta 🇲🇹","Comino, Malta 🇲🇹",
  "Nicosia, Cyprus","Limassol, Cyprus","Paphos, Cyprus",
  "Istanbul, Turkey","Ankara, Turkey","Izmir, Turkey","Antalya, Turkey","Cappadocia, Turkey","Bodrum, Turkey",
  "Andorra 🇦🇩","Monaco 🇲🇨","San Marino 🇸🇲","Liechtenstein 🇱🇮","Vatican City 🇻🇦","Luxembourg",
  "Gibraltar 🇬🇧",

  // ── BRITISH OVERSEAS TERRITORIES ──
  "Bermuda 🇬🇧","Cayman Islands 🇬🇧","British Virgin Islands 🇬🇧",
  "Turks & Caicos Islands 🇬🇧","Anguilla 🇬🇧","Montserrat 🇬🇧",
  "Falkland Islands 🇬🇧","Ascension Island 🇸🇭","St Helena 🇸🇭","Tristan da Cunha 🇸🇭",
  "Greenland, Denmark 🇬🇱",

  // ── ASIA ──
  "Tokyo, Japan","Osaka, Japan","Kyoto, Japan","Sapporo, Japan","Hiroshima, Japan","Nara, Japan","Fukuoka, Japan",
  "Beijing, China","Shanghai, China","Shenzhen, China","Guangzhou, China","Chengdu, China","Xi'an, China","Guilin, China",
  "Hong Kong SAR, China 🇭🇰","Macau SAR, China 🇲🇴","Taiwan 🇹🇼","Taipei, Taiwan","Kaohsiung, Taiwan",
  "Seoul, South Korea","Busan, South Korea","Jeju Island, South Korea",
  "Singapore",
  "Bangkok, Thailand","Chiang Mai, Thailand","Phuket, Thailand","Pattaya, Thailand","Hua Hin, Thailand","Pai, Thailand",
  "Koh Samui, Thailand","Koh Phangan, Thailand","Koh Tao, Thailand",
  "Koh Lipe, Thailand","Koh Chang, Thailand","Koh Lanta, Thailand","Koh Samet, Thailand","Koh Yao Noi, Thailand",
  "Bali, Indonesia","Jakarta, Indonesia","Surabaya, Indonesia","Yogyakarta, Indonesia",
  "Lombok, Indonesia","Flores, Indonesia","Raja Ampat, Indonesia","Nusa Penida, Bali, Indonesia",
  "Nusa Lembongan, Bali, Indonesia","Gili Islands, Indonesia","Komodo Island, Indonesia",
  "Banda Islands, Indonesia","Togean Islands, Indonesia","Wakatobi, Indonesia",
  "Bintan Island, Indonesia","Batam Island, Indonesia",
  "Kuala Lumpur, Malaysia","Penang, Malaysia","Kota Kinabalu, Malaysia",
  "Langkawi, Malaysia","Tioman Island, Malaysia","Perhentian Islands, Malaysia","Redang Island, Malaysia",
  "Manila, Philippines","Cebu, Philippines","Davao, Philippines",
  "Palawan, Philippines","Boracay, Philippines","Siargao, Philippines",
  "Bohol, Philippines","El Nido, Philippines","Coron, Philippines",
  "Ho Chi Minh City, Vietnam","Hanoi, Vietnam","Da Nang, Vietnam","Hoi An, Vietnam",
  "Phu Quoc, Vietnam","Con Dao Islands, Vietnam","Ha Long Bay, Vietnam","Cat Ba Island, Vietnam",
  "Phnom Penh, Cambodia","Siem Reap, Cambodia","Kampot, Cambodia",
  "Yangon, Myanmar","Mandalay, Myanmar","Bagan, Myanmar","Inle Lake, Myanmar",
  "Colombo, Sri Lanka","Kandy, Sri Lanka","Galle, Sri Lanka","Sigiriya, Sri Lanka",
  "Kathmandu, Nepal","Pokhara, Nepal","Chitwan, Nepal",
  "Dhaka, Bangladesh","Chittagong, Bangladesh","Cox's Bazar, Bangladesh",
  "Karachi, Pakistan","Lahore, Pakistan","Islamabad, Pakistan",
  "Ulaanbaatar, Mongolia",
  "Tashkent, Uzbekistan","Samarkand, Uzbekistan","Bukhara, Uzbekistan",
  "Almaty, Kazakhstan","Astana, Kazakhstan",
  "Tbilisi, Georgia","Yerevan, Armenia","Baku, Azerbaijan",
  "Beirut, Lebanon","Amman, Jordan","Petra, Jordan","Wadi Rum, Jordan",
  "Jerusalem, Israel","Tel Aviv, Israel","Haifa, Israel",
  "Riyadh, Saudi Arabia","Jeddah, Saudi Arabia","Mecca, Saudi Arabia","AlUla, Saudi Arabia",
  "Doha, Qatar","Kuwait City, Kuwait","Manama, Bahrain","Muscat, Oman","Salalah, Oman",
  "Baghdad, Iraq","Erbil (Kurdistan), Iraq","Tehran, Iran","Isfahan, Iran","Shiraz, Iran",
  "Kabul, Afghanistan",
  "Bishkek, Kyrgyzstan","Dushanbe, Tajikistan","Ashgabat, Turkmenistan",

  // ── INDIA ──
  "Mumbai, India","Delhi, India","New Delhi, India","Bangalore, India","Hyderabad, India",
  "Chennai, India","Kolkata, India","Pune, India","Ahmedabad, India","Jaipur, India",
  "Goa, India","North Goa, India","South Goa, India",
  "Agra, India","Varanasi, India","Amritsar, India","Kochi, India","Jaisalmer, India",
  "Udaipur, India","Jodhpur, India","Rishikesh, India","Haridwar, India","Shimla, India",
  "Manali, India","Dharamsala, India","Leh Ladakh, India","Spiti Valley, India","Zanskar Valley, India",
  "Andaman & Nicobar Islands, India","Lakshadweep Islands, India",
  "Pondicherry, India","Daman and Diu, India","Kutch, Gujarat, India","Chopta, Uttarakhand, India",

  // ── INDIAN OCEAN ──
  "Maldives 🇲🇻","Malé, Maldives","Mauritius 🇲🇺","Port Louis, Mauritius",
  "Réunion 🇷🇪","Seychelles 🇸🇨","Victoria, Seychelles","Praslin, Seychelles","La Digue, Seychelles",
  "Comoros 🇰🇲","Moroni, Comoros","Madagascar 🇲🇬","Antananarivo, Madagascar","Nosy Be, Madagascar",

  // ── PACIFIC ISLANDS ──
  "Fiji 🇫🇯","Suva, Fiji","Nadi, Fiji","Coral Coast, Fiji",
  "Vanuatu 🇻🇺","Port Vila, Vanuatu",
  "Solomon Islands 🇸🇧","Honiara, Solomon Islands",
  "Samoa 🇼🇸","Apia, Samoa",
  "Tonga 🇹🇴","Nuku'alofa, Tonga",
  "Kiribati 🇰🇮","South Tarawa, Kiribati",
  "Tuvalu 🇹🇻","Funafuti, Tuvalu",
  "Nauru 🇳🇷","Palau 🇵🇼","Ngerulmud, Palau",
  "Micronesia 🇫🇲","Palikir, Micronesia",
  "Marshall Islands 🇲🇭","Majuro, Marshall Islands",
  "Cook Islands 🇨🇰","Avarua, Cook Islands","Rarotonga, Cook Islands","Aitutaki, Cook Islands",
  "Niue 🇳🇺","Alofi, Niue",
  "French Polynesia 🇵🇫","Bora Bora, French Polynesia 🇵🇫","Tahiti, French Polynesia 🇵🇫",
  "Moorea, French Polynesia 🇵🇫","Huahine, French Polynesia 🇵🇫",
  "Rangiroa, French Polynesia 🇵🇫","Fakarava, French Polynesia 🇵🇫",
  "New Caledonia 🇳🇨","Nouméa, New Caledonia",
  "Wallis and Futuna","Tokelau",
  "Papua New Guinea","Port Moresby, Papua New Guinea",

  // ── CARIBBEAN ──
  "Turks & Caicos Islands 🇬🇧","Anguilla 🇬🇧","Montserrat 🇬🇧",
  "St Kitts and Nevis 🇰🇳","Dominica 🇩🇲","St Vincent and the Grenadines 🇻🇨",
  "Grenada 🇬🇩","Saint Lucia 🇱🇨","Antigua and Barbuda 🇦🇬",
  "British Virgin Islands 🇬🇧","US Virgin Islands 🇺🇸","Cayman Islands 🇬🇧",
  "Bonaire 🇧🇶","Curaçao 🇨🇼","Aruba 🇦🇼","Saba","Sint Maarten / Saint Martin",
  "Guadeloupe 🇬🇵","Martinique 🇲🇶","Saint Barthélemy (St Barts), Caribbean",
  "Haiti 🇭🇹","Sint Eustatius",
  "Havana, Cuba","Santo Domingo, Dominican Republic","Port-au-Prince, Haiti",
  "Kingston, Jamaica","Nassau, Bahamas","Bridgetown, Barbados","Port of Spain, Trinidad and Tobago",

  // ── MEDITERRANEAN ──
  "Valletta, Malta 🇲🇹","Gozo, Malta 🇲🇹","Comino, Malta 🇲🇹",

  // ── AFRICA ──
  "Cairo, Egypt","Alexandria, Egypt","Luxor, Egypt","Hurghada, Egypt","Sharm el-Sheikh, Egypt","Aswan, Egypt",
  "Casablanca, Morocco","Marrakech, Morocco","Fez, Morocco","Tangier, Morocco","Chefchaouen, Morocco","Essaouira, Morocco",
  "Tunis, Tunisia","Sfax, Tunisia","Djerba, Tunisia",
  "Algiers, Algeria","Oran, Algeria",
  "Tripoli, Libya",
  "Lagos, Nigeria","Abuja, Nigeria","Kano, Nigeria",
  "Nairobi, Kenya","Mombasa, Kenya","Masai Mara, Kenya","Amboseli, Kenya",
  "Addis Ababa, Ethiopia","Lalibela, Ethiopia","Danakil Depression, Ethiopia",
  "Dar es Salaam, Tanzania","Zanzibar, Tanzania 🇹🇿","Arusha, Tanzania","Serengeti, Tanzania",
  "Zanzibar Stone Town, Tanzania","Nungwi, Zanzibar","Kendwa, Zanzibar","Paje, Zanzibar","Jambiani, Zanzibar",
  "Pemba Island, Tanzania","Mafia Island, Tanzania",
  "Kampala, Uganda","Kigali, Rwanda","Bujumbura, Burundi","Gorilla Trekking, Uganda",
  "Accra, Ghana","Kumasi, Ghana",
  "Dakar, Senegal","Abidjan, Côte d'Ivoire",
  "Cape Town, South Africa","Johannesburg, South Africa","Durban, South Africa","Pretoria, South Africa",
  "Kruger National Park, South Africa","Garden Route, South Africa",
  "Lusaka, Zambia","Victoria Falls, Zambia","Harare, Zimbabwe","Victoria Falls, Zimbabwe",
  "Gaborone, Botswana","Okavango Delta, Botswana","Chobe, Botswana",
  "Windhoek, Namibia","Sossusvlei, Namibia","Etosha, Namibia",
  "Maputo, Mozambique","Antananarivo, Madagascar","Nosy Be, Madagascar",
  "Mogadishu, Somalia","Djibouti City, Djibouti",
  "Zanzibar, Tanzania 🇹🇿",
  "Mayotte 🇾🇹","Cape Verde 🇨🇻","São Tomé and Príncipe 🇸🇹",

  // ── AMERICAS ──
  "Toronto, Canada","Vancouver, Canada","Montreal, Canada","Calgary, Canada","Ottawa, Canada",
  "Quebec City, Canada","Banff, Canada","Whistler, Canada",
  "Mexico City, Mexico","Cancún, Mexico","Guadalajara, Mexico","Monterrey, Mexico",
  "Playa del Carmen, Mexico","Tulum, Mexico","Oaxaca, Mexico","Cabo San Lucas, Mexico",
  "São Paulo, Brazil","Rio de Janeiro, Brazil","Brasília, Brazil","Salvador, Brazil",
  "Recife, Brazil","Manaus, Brazil","Florianópolis, Brazil","Iguazu Falls, Brazil",
  "Buenos Aires, Argentina","Córdoba, Argentina","Mendoza, Argentina","Bariloche, Argentina","Patagonia, Argentina",
  "Santiago, Chile","Valparaíso, Chile","Atacama, Chile","Torres del Paine, Chile",
  "Lima, Peru","Cusco, Peru","Machu Picchu, Peru","Lake Titicaca, Peru",
  "Bogotá, Colombia","Medellín, Colombia","Cartagena, Colombia","Cali, Colombia",
  "Quito, Ecuador","Guayaquil, Ecuador","Galápagos Islands, Ecuador",
  "La Paz, Bolivia","Sucre, Bolivia","Uyuni Salt Flat, Bolivia",
  "Asunción, Paraguay","Montevideo, Uruguay","Punta del Este, Uruguay",
  "Caracas, Venezuela","Maracaibo, Venezuela","Angel Falls, Venezuela",
  "Panama City, Panama","San José, Costa Rica","Tegucigalpa, Honduras",
  "Guatemala City, Guatemala","Antigua, Guatemala","Belize City, Belize","Belize Barrier Reef, Belize",
  "San Salvador, El Salvador","Managua, Nicaragua","Granada, Nicaragua",
  "Havana, Cuba","Trinidad, Cuba",
  "French Guiana 🇬🇫",

  // ── OCEANIA ──
  "Sydney, Australia","Melbourne, Australia","Brisbane, Australia","Perth, Australia",
  "Adelaide, Australia","Canberra, Australia","Gold Coast, Australia","Cairns, Australia",
  "Great Barrier Reef, Australia","Uluru, Australia","Tasmania, Australia","Byron Bay, Australia",
  "Auckland, New Zealand","Wellington, New Zealand","Christchurch, New Zealand",
  "Queenstown, New Zealand","Rotorua, New Zealand","Milford Sound, New Zealand",
  "Suva, Fiji","Nadi, Fiji","Apia, Samoa","Honiara, Solomon Islands",

  // ── SMALL STATES ──
  "San Marino 🇸🇲","Liechtenstein 🇱🇮","Monaco 🇲🇨","Andorra 🇦🇩","Vatican City 🇻🇦",
];

// Countries-only list for passport field
export const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia",
  "Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium",
  "Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria",
  "Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad",
  "Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic",
  "Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea",
  "Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia",
  "Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras",
  "Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan",
  "Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho",
  "Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives",
  "Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco",
  "Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands",
  "New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan",
  "Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
  "Samoa","San Marino","São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone",
  "Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan",
  "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania",
  "Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "UAE","Uganda","Ukraine","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

/**
 * Fuzzy match: returns true if query roughly matches target.
 * Simple approach: allow up to 2 character differences for strings > 4 chars.
 */
function fuzzyMatch(query, target) {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  // Sliding window similarity for short queries
  if (q.length < 3) return false;
  let matches = 0;
  for (let i = 0; i < q.length; i++) {
    if (t.includes(q[i])) matches++;
  }
  const ratio = matches / q.length;
  return ratio >= 0.8;
}

/**
 * Search destinations with alias resolution + fuzzy matching.
 * Returns up to 6 results.
 */
export function searchDestinations(query, countriesOnly = false) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const source = countriesOnly ? COUNTRIES : LOCATIONS;

  // 1. Check aliases first
  const aliasMatch = ALIASES[q];
  const aliasResults = aliasMatch ? [aliasMatch] : [];

  // 2. Prefix / contains matches (highest priority)
  const exact = source.filter(loc => loc.toLowerCase().startsWith(q));
  const contains = source.filter(loc => !loc.toLowerCase().startsWith(q) && loc.toLowerCase().includes(q));

  // 3. Fuzzy matches (lowest priority)
  const fuzzy = source.filter(loc => {
    const lc = loc.toLowerCase();
    if (lc.includes(q)) return false; // already covered
    return fuzzyMatch(q, lc);
  });

  const combined = [...new Set([...aliasResults, ...exact, ...contains, ...fuzzy])];
  return combined.slice(0, 6);
}