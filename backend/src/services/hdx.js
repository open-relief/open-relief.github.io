import axios from 'axios'

const COUNTRY_CODES = {
  afghanistan: 'AF', bangladesh: 'BD', brazil: 'BR', cambodia: 'KH',
  cameroon: 'CM', chad: 'TD', china: 'CN', colombia: 'CO',
  'democratic republic of congo': 'CD', drc: 'CD', ecuador: 'EC',
  ethiopia: 'ET', ghana: 'GH', guatemala: 'GT', haiti: 'HT',
  honduras: 'HN', india: 'IN', indonesia: 'ID', iran: 'IR',
  iraq: 'IQ', kenya: 'KE', laos: 'LA', libya: 'LY',
  madagascar: 'MG', malawi: 'MW', mali: 'ML', mexico: 'MX',
  mozambique: 'MZ', myanmar: 'MM', nepal: 'NP', nigeria: 'NG',
  pakistan: 'PK', peru: 'PE', philippines: 'PH', senegal: 'SN',
  'sierra leone': 'SL', somalia: 'SO', 'south sudan': 'SS',
  sudan: 'SD', syria: 'SY', tanzania: 'TZ', thailand: 'TH',
  turkey: 'TR', turkiye: 'TR', uganda: 'UG', ukraine: 'UA',
  venezuela: 'VE', vietnam: 'VN', yemen: 'YE', zambia: 'ZM',
  zimbabwe: 'ZW', singapore: 'SG'
}

function toISO2(countryName) {
  return COUNTRY_CODES[countryName.toLowerCase()] || null
}

const INDICATORS = {
  poverty_pct: 'SI.POV.NAHC',
  gdp_per_capita_usd: 'NY.GDP.PCAP.CD',
  population: 'SP.POP.TOTL',
  undernourishment_pct: 'SN.ITK.DEFC.ZS',
  disaster_risk_index: 'EN.CLC.DRSK.XQ'
}

/**
 * Fetch humanitarian & socioeconomic indicators from the World Bank API.
 */
export async function fetchHDX(country) {
  const iso2 = toISO2(country)

  if (!iso2) {
    return {
      found: false,
      summary: `No country code mapping for "${country}". World Bank data unavailable.`,
      iso2: null
    }
  }

  const BASE = `https://api.worldbank.org/v2/country/${iso2}/indicator`
  const params = { format: 'json', mrv: 1 }

  try {
    const results = await Promise.allSettled(
      Object.entries(INDICATORS).map(([name, code]) =>
        axios
          .get(`${BASE}/${code}`, { params, timeout: 10000 })
          .then((r) => ({ name, value: r.data?.[1]?.[0]?.value ?? null, date: r.data?.[1]?.[0]?.date ?? null }))
      )
    )

    const indicators = {}
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.value !== null) {
        indicators[r.value.name] = { value: r.value.value, year: r.value.date }
      }
    }

    const hasData = Object.keys(indicators).length > 0

    return {
      found: hasData,
      iso2,
      summary: hasData
        ? `World Bank data retrieved for ${country} (${iso2}).`
        : `World Bank returned no records for ${country} (${iso2}).`,
      indicators
    }
  } catch (err) {
    console.error('World Bank API error:', err.message)
    return { found: false, summary: `World Bank API unavailable: ${err.message}`, iso2 }
  }
}
