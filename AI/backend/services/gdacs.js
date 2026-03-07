const axios = require("axios");

/**
 * Fetch recent disaster events from GDACS near a given location.
 * @param {string} country  - Country name (used for display/filtering)
 * @param {string} eventType - "EQ" (earthquake) | "TC" (cyclone) | "FL" (flood) | "VO" | "DR" | "WF"
 * @param {string} incidentDate - ISO date string of the reported incident
 * @returns {object} Structured GDACS data summary
 */
async function fetchGDACS(country, eventType, incidentDate) {
  try {
    const incDate = new Date(incidentDate);
    const fromDate = new Date(incDate);
    fromDate.setDate(fromDate.getDate() - 30); // look 30 days back

    const params = {
      eventtype: eventType || "EQ,TC,FL",
      alertlevel: "Green,Orange,Red",
      fromdate: fromDate.toISOString().split("T")[0],
      todate: new Date().toISOString().split("T")[0],
      limit: 10,
    };

    const response = await axios.get(
      "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH",
      {
        params,
        timeout: 10000,
        headers: { Accept: "application/json" },
      }
    );

    const events = response.data?.features || [];

    // Filter events by country name (case-insensitive)
    const relevant = events.filter((e) => {
      const props = e.properties || {};
      return (
        (props.country || "").toLowerCase().includes(country.toLowerCase()) ||
        (props.name || "").toLowerCase().includes(country.toLowerCase())
      );
    });

    if (relevant.length === 0) {
      return {
        found: false,
        summary: `No GDACS events found for ${country} around ${incidentDate}.`,
        events: [],
      };
    }

    const formatted = relevant.map((e) => {
      const p = e.properties || {};
      return {
        eventId: p.eventid,
        eventType: p.eventtype,
        name: p.name,
        country: p.country,
        alertLevel: p.alertlevel,
        severity: p.severity?.toString() || "N/A",
        magnitude: p.maxmagnitude || p.maxintensity || null,
        affectedPopulation: p.affectedcountries?.[0]?.countryaffected || null,
        fromDate: p.fromdate,
        toDate: p.todate,
        description: p.description,
      };
    });

    return {
      found: true,
      summary: `Found ${formatted.length} GDACS event(s) matching ${country}.`,
      events: formatted,
      highestAlert: formatted.reduce((max, e) => {
        const order = { Red: 3, Orange: 2, Green: 1 };
        return (order[e.alertLevel] || 0) > (order[max] || 0)
          ? e.alertLevel
          : max;
      }, "Green"),
    };
  } catch (err) {
    console.error("GDACS API error:", err.message);
    return {
      found: false,
      summary: "GDACS API unavailable or returned an error.",
      events: [],
      error: err.message,
    };
  }
}

module.exports = { fetchGDACS };
