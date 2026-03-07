import axios from 'axios'

const DISASTER_TYPE_MAP = {
  earthquake: 'EQ', cyclone: 'TC', hurricane: 'TC', typhoon: 'TC',
  flood: 'FL', volcano: 'VO', drought: 'DR', wildfire: 'WF', other: null
}

export function disasterTypeToGdacsCode(disasterType) {
  return DISASTER_TYPE_MAP[String(disasterType || '').toLowerCase()] || null
}

/**
 * Fetch recent disaster events from GDACS near a given country.
 * Uses the GDACS REST API with retry logic and HTML-response detection.
 */
export async function fetchGDACS(country, eventType, incidentDate) {
  const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH'

  try {
    const incDate = new Date(incidentDate)
    if (isNaN(incDate.getTime())) throw new Error(`Invalid incidentDate: ${incidentDate}`)

    // Look 60 days back for better coverage
    const fromDate = new Date(incDate)
    fromDate.setDate(fromDate.getDate() - 60)
    const toDate = new Date()
    // If incidentDate is in the past beyond today, extend toDate
    if (incDate < toDate) toDate.setTime(Math.max(toDate.getTime(), incDate.getTime() + 86400000))

    // Build URL with literal commas (GDACS expects them unencoded)
    const alertLevels = 'Green,Orange,Red'
    const eventTypes = eventType || 'EQ,TC,FL,VO,DR,WF'
    const qs = [
      `eventtype=${eventTypes}`,
      `alertlevel=${alertLevels}`,
      `fromdate=${fromDate.toISOString().split('T')[0]}`,
      `todate=${toDate.toISOString().split('T')[0]}`,
      'limit=20'
    ].join('&')
    const url = `${GDACS_URL}?${qs}`

    let response = null
    let lastErr = null

    // Retry up to 3 times with backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await axios.get(url, {
          timeout: 12000,
          headers: { Accept: 'application/json', 'User-Agent': 'OpenRelief/1.0' }
        })
        // Guard: GDACS sometimes returns HTML error pages with status 200
        const contentType = String(response.headers?.['content-type'] || '')
        if (contentType.includes('text/html')) {
          throw new Error('GDACS returned an HTML page instead of JSON (server may be under maintenance)')
        }
        break // success
      } catch (err) {
        lastErr = err
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 2000))
        }
      }
    }

    if (!response) throw lastErr

    const events = response.data?.features || []

    // Filter events by country name match (case-insensitive substring)
    const lowerCountry = country.toLowerCase().trim()
    const relevant = events.filter((e) => {
      const props = e.properties || {}
      return (
        (props.country || '').toLowerCase().includes(lowerCountry) ||
        (props.name || '').toLowerCase().includes(lowerCountry) ||
        (props.description || '').toLowerCase().includes(lowerCountry)
      )
    })

    if (relevant.length === 0) {
      // Return unfiltered summary so Gemini still has context even without a country match
      const allSummary = events.length > 0
        ? `No GDACS events matched "${country}" specifically, but ${events.length} global event(s) found in the date range.`
        : `No GDACS events found in the date range (${fromDate.toISOString().split('T')[0]} – ${toDate.toISOString().split('T')[0]}).`
      return { found: false, summary: allSummary, events: [] }
    }

    const formatted = relevant.map((e) => {
      const p = e.properties || {}
      return {
        eventId: p.eventid,
        eventType: p.eventtype,
        name: p.name,
        country: p.country,
        alertLevel: p.alertlevel,
        severity: p.severity?.toString() || 'N/A',
        magnitude: p.maxmagnitude || p.maxintensity || null,
        affectedPopulation: p.affectedcountries?.[0]?.countryaffected || null,
        fromDate: p.fromdate,
        toDate: p.todate,
        description: p.description
      }
    })

    const highestAlert = formatted.reduce((max, e) => {
      const order = { Red: 3, Orange: 2, Green: 1 }
      return (order[e.alertLevel] || 0) > (order[max] || 0) ? e.alertLevel : max
    }, 'Green')

    return {
      found: true,
      summary: `Found ${formatted.length} GDACS event(s) matching "${country}". Highest alert: ${highestAlert}.`,
      events: formatted,
      highestAlert
    }
  } catch (err) {
    console.error('[gdacs] API error:', err.message)
    return {
      found: false,
      summary: `GDACS API error: ${err.message}`,
      events: [],
      error: err.message
    }
  }
}

