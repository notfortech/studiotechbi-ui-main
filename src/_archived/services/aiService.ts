import { API_BASE_URL } from "../core/constants";

export interface InsightRequest {
  periodType: string;
  period?: string;
  clientCode?: string;
  filters?: {
    column: string;
    values: string[];
  }[];
}

export const getAIInsights = async (token: string, payload: InsightRequest) => {
  const response = await fetch(`${API_BASE_URL}/ai/insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Failed to fetch AI insights");
  }

  return await response.json();
};