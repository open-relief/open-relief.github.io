const axios = require("axios");

/**
 * Fetch disaster-related news from GDELT for a given country + disaster type.
 * GDELT does NOT require an API key.
 * @param {string} country - Country name
 * @param {string} disasterType - e.g. "flood", "earthquake", "cyclone"
 * @returns {object} Structured GDELT news summary
 */
async function fetchGDELT(country, disasterType) {
  try {
    const query = `${disasterType} ${country}`;

    const response = await axios.get(
      "https://api.gdeltproject.org/api/v2/doc/doc",
      {
        params: {
          query: query,
          mode: "artlist",
          maxrecords: 10,
          format: "json",
          timespan: "4weeks",
          sort: "DateDesc",
        },
        timeout: 10000,
      }
    );

    const articles = response.data?.articles || [];

    if (articles.length === 0) {
      return {
        found: false,
        summary: `No GDELT news coverage found for "${disasterType}" in ${country}.`,
        articles: [],
      };
    }

    return {
      found: true,
      summary: `GDELT found ${articles.length} recent news articles for "${disasterType}" in ${country}.`,
      coverageCount: articles.length,
      articles: articles.slice(0, 5).map((a) => ({
        title: a.title,
        url: a.url,
        source: a.domain,
        seendate: a.seendate,
        language: a.language,
        socialimage: a.socialimage,
      })),
    };
  } catch (err) {
    // GDELT is optional — fail gracefully
    console.warn("GDELT API error (non-critical):", err.message);
    return {
      found: false,
      summary: "GDELT API unavailable (optional source — continuing).",
      articles: [],
    };
  }
}

module.exports = { fetchGDELT };
