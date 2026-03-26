import { apiGet } from "@/lib/api";

export interface DrawResultSummary {
  match_type: string;
  pool_amount: number;
  winner_count: number;
  amount_per_winner: number;
  status: string;
}

export interface PublicDraw {
  id: string;
  draw_date: string;
  draw_numbers: number[];
  status: string;
  total_pool_amount: number;
  five_match_pool: number;
  four_match_pool: number;
  three_match_pool: number;
  rolloverAmount?: number;
  results: DrawResultSummary[];
}

export interface DrawEligibility {
  canParticipate: boolean;
  subscriptionActive: boolean;
  scoreCount: number;
  scoresNeeded: number;
  message: string;
}

export interface UserDrawSummary {
  eligibility: DrawEligibility;
  latestDraw: (PublicDraw & { userMatches: number; isWinner: boolean }) | null;
  recentDraws: Array<PublicDraw & { userMatches: number; isWinner: boolean }>;
}

export async function fetchPublicDraws() {
  const response = await apiGet<{ draws: PublicDraw[] }>("/api/draws/public");
  return response.draws || [];
}

export async function fetchUserDrawSummary(userId: string) {
  return apiGet<UserDrawSummary>(`/api/draws/summary/${userId}`);
}
