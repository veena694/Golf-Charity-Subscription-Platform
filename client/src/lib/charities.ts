import { apiGet } from "@/lib/api";

export interface Charity {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  website_url: string | null;
  featured: boolean;
  impact_summary?: string | null;
  upcoming_events?: Array<{
    title?: string;
    date?: string;
    location?: string;
  }>;
}

function normalizeCharity(charity: Partial<Charity>): Charity {
  return {
    id: charity.id || "",
    name: charity.name || "Unnamed Charity",
    description: charity.description ?? null,
    image_url: charity.image_url ?? null,
    website_url: charity.website_url ?? null,
    featured: Boolean(charity.featured),
    impact_summary: charity.impact_summary ?? null,
    upcoming_events: Array.isArray(charity.upcoming_events) ? charity.upcoming_events : [],
  };
}

export async function fetchCharities() {
  const endpoints = ["/api/charities", "/api/admin/charities"];
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const response = await apiGet<{ charities: Charity[] }>(endpoint);
      return (response.charities || []).map(normalizeCharity);
    } catch (error) {
      lastError = error;

      if (!(error instanceof Error) || error.message !== "API route not found") {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to load charities.");
}

export async function fetchFeaturedCharities() {
  const response = await apiGet<{ charities: Charity[] }>("/api/charities/featured");
  return (response.charities || []).map(normalizeCharity);
}
