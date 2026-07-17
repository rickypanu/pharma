import axios from "axios";

const API_BASE_URL = "https://pharma-analytic.onrender.com";

// Create a reusable axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // optional: set timeout
});

// Function to fetch optimized territories
export const fetchTerritories = async (numReps, strategy) => {
  try {
    const response = await api.get("/optimize-territories", {
      params: { num_reps: numReps, strategy },
    });

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return {
      hcps: response.data.data || [],
      metrics: response.data.metrics || null,
    };
  } catch (error) {
    throw new Error(
      error.response?.data?.error ||
        "Could not connect to the FastAPI server. Ensure it is running on port 8000."
    );
  }
};
