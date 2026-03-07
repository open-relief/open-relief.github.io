const axios = require("axios");

// Country name → ISO2 + ISO3 mapping for World Bank API
const COUNTRY_CODES = {
  afghanistan: "AF", bangladesh: "BD", brazil: "BR", cambodia: "KH",
  cameroon: "CM", chad: "TD", china: "CN", colombia: "CO",
  "democratic republic of congo": "CD", drc: "CD", ecuador: "EC",
  ethiopia: "ET", ghana: "GH", guatemala: "GT", haiti: "HT",
  honduras: "HN", india: "IN", indonesia: "ID", iran: "IR",
  iraq: "IQ", kenya: "KE", laos: "LA", libya: "LY",
  madagascar: "MG", malawi: "MW", mali: "ML", mexico: "MX",
  mozambique: "MZ", myanmar: "MM", nepal: "NP", nigeria: "NG",
  pakistan: "PK", peru: "PE", philippines: "PH", senegal: "SN",
  "sierra leone": "SL", somalia: "SO", "south sudan": "SS",
  sudan: "SD", syria: "SY", tanzania: "TZ", thailand: "TH",
  turkey: "TR", turkiye: "TR", uganda: "UG", ukraine: "UA",
  venezuela: "VE", vietnam: "VN", yemen: "YE", zambia: "ZM",
  zimbabwe: "ZW",
};

function toISO2(countryName) {
  return COUNTRY_CODES[countryName.toLowerCase()] || null;
}

// World Bank indicators relevant to disaster vulnerability
const INDICATORS = {
  poverty_pct: "SI.POV.NAHC",          // Poverty headcount ratio (national, %)
  gdp_per_capita_usd: "NY.GDP.PCAP.CD", // GDP per capita (current USD)
  population: "SP.POP.TOTL",            // Total population
  undernourishment_pct: "SN.ITK.DEFC.ZS", // Undernourishment (%)
  disaster_risk_index: "EN.CLC.DRSK.XQ", // ND-GAIN country risk index
};

/**
 * Fetch humanitarian & socioeconomic indicators from the World Bank API.
 * @param {string} country - Country name
 * @returns {object} Contextual vulnerability data summary
 */
async function fetchHDX(country) {
  const iso2 = toISO2(country);

  if (!iso2) {
    return {
      found: false,
      summary: `No country code mapping for "${country}". World Bank data unavailable.`,
      iso2: null,
    };
  }

  const BASE = `https://api.worldbank.org/v2/country/${iso2}/indicator`;
  const params = { format: "json", mrv: 1 };

  try {
    const results = await Promise.allSettled(
      Object.entries(INDICATORS).map(([name, code]) =>
        axios
          .get(`${BASE}/${code}`, { params, timeout: 10000 })
          .then((r) => ({ name, value: r.data?.[1]?.[0]?.value ?? null, date: r.data?.[1]?.[0]?.date ?? null }))
      )
    );

    const indicators = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.value !== null) {
        indicators[r.value.name] = { value: r.value.value, year: r.value.date };
      }
    }

    const hasData = Object.keys(indicators).length > 0;

    return {
      found: hasData,
      iso2,
      summary: hasData
        ? `World Bank data retrieved for ${country} (${iso2}).`
        : `World Bank returned no records for ${country} (${iso2}).`,
      indicators,
    };
  } catch (err) {
    console.error("World Bank API error:", err.message);
    return {
      found: false,
      iso2,
      summary: "World Bank API unavailable or returned an error.",
      error: err.message,
    };
  }
}

module.exports = { fetchHDX };
