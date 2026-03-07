import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

/**
 * Submit a financial aid claim for AI evaluation.
 * @param {object} claimData - { name, country, disasterType, incidentDate, description, amount }
 */
export async function submitClaim(claimData) {
  const response = await api.post("/claims", claimData);
  return response.data;
}
