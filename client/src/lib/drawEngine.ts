import { supabase } from "./supabase";

export interface DrawConfig {
  drawDate: Date;
  matchTypes: ("5-number" | "4-number" | "3-number")[];
  drawMethod: "random" | "algorithmic";
  totalPoolAmount: number;
}

export interface DrawNumbers {
  draw: number[];
  date: string;
}

export interface DrawResult {
  matchType: "5-match" | "4-match" | "3-match";
  winners: string[];
  poolAmount: number;
  amountPerWinner: number;
}

/**
 * Generate random draw numbers (0-45, 5 numbers)
 */
export function generateRandomDrawNumbers(): number[] {
  const numbers: number[] = [];
  while (numbers.length < 5) {
    const num = Math.floor(Math.random() * 46);
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers.sort((a, b) => a - b);
}

/**
 * Get most frequent and least frequent user scores for algorithmic draw
 */
export async function getAlgorithmicDrawNumbers(): Promise<number[]> {
  try {
    // Get all active users' latest scores
    const { data: scores } = await supabase
      .from("golf_scores")
      .select("score")
      .order("created_at", { ascending: false });

    if (!scores || scores.length === 0) {
      return generateRandomDrawNumbers();
    }

    // Count frequency of each score
    const scoreFrequency: { [key: number]: number } = {};
    scores.forEach((entry: any) => {
      const score = entry.score;
      scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
    });

    // Get most frequent scores
    const sorted = Object.entries(scoreFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([score]) => parseInt(score));

    // Take top 3 most frequent + 2 random
    const numbers = sorted.slice(0, 3);
    while (numbers.length < 5) {
      const num = Math.floor(Math.random() * 46);
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }

    return numbers.sort((a, b) => a - b);
  } catch (error) {
    console.error("Error generating algorithmic draw numbers:", error);
    return generateRandomDrawNumbers();
  }
}

/**
 * Count matching numbers between user's scores and draw
 */
export function countMatches(userScores: number[], drawNumbers: number[]): number {
  const userSet = new Set(userScores);
  return drawNumbers.filter((num) => userSet.has(num)).length;
}

/**
 * Get all users with their latest scores and match counts
 */
export async function getUsersWithMatches(
  drawNumbers: number[]
): Promise<
  Array<{
    userId: string;
    scores: number[];
    matches: number;
    userEmail: string;
  }>
> {
  try {
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .eq("subscription_status", "active");

    if (!users) return [];

    const usersWithMatches = await Promise.all(
      users.map(async (user: any) => {
        const { data: scores } = await supabase
          .from("golf_scores")
          .select("score")
          .eq("user_id", user.id)
          .order("score_date", { ascending: false })
          .limit(5);

        const userScores = (scores || []).map((s: any) => s.score);
        const matches = countMatches(userScores, drawNumbers);

        return {
          userId: user.id,
          scores: userScores,
          matches,
          userEmail: user.email,
        };
      })
    );

    return usersWithMatches;
  } catch (error) {
    console.error("Error getting users with matches:", error);
    return [];
  }
}

/**
 * Calculate prize pool distribution
 */
export function calculatePrizeDistribution(
  totalPool: number
): {
  "5-match": number;
  "4-match": number;
  "3-match": number;
} {
  return {
    "5-match": totalPool * 0.4,
    "4-match": totalPool * 0.35,
    "3-match": totalPool * 0.25,
  };
}

/**
 * Create a draw in the database
 */
export async function createDraw(config: DrawConfig) {
  try {
    // Generate draw numbers
    const drawNumbers =
      config.drawMethod === "random"
        ? generateRandomDrawNumbers()
        : await getAlgorithmicDrawNumbers();

    // Get users with matches
    const usersWithMatches = await getUsersWithMatches(drawNumbers);

    // Group by match count
    const fiveMatchers = usersWithMatches.filter((u) => u.matches === 5);
    const fourMatchers = usersWithMatches.filter((u) => u.matches === 4);
    const threeMatchers = usersWithMatches.filter((u) => u.matches === 3);

    // Calculate prize distribution
    const prizeDistribution = calculatePrizeDistribution(config.totalPoolAmount);

    // Create draw record
    const { data: drawData, error: drawError } = await supabase
      .from("draws")
      .insert([
        {
          draw_date: config.drawDate.toISOString().split("T")[0],
          draw_numbers: drawNumbers,
          draw_type: config.matchTypes[0],
          status: "pending",
          total_pool_amount: config.totalPoolAmount,
          five_match_pool: prizeDistribution["5-match"],
          four_match_pool: prizeDistribution["4-match"],
          three_match_pool: prizeDistribution["3-match"],
        },
      ])
      .select()
      .single();

    if (drawError) throw drawError;

    // Create draw results
    const results = [];

    if (fiveMatchers.length > 0) {
      results.push({
        draw_id: drawData.id,
        match_type: "5-match",
        pool_amount: prizeDistribution["5-match"],
        winner_count: fiveMatchers.length,
        amount_per_winner:
          prizeDistribution["5-match"] / fiveMatchers.length,
        status: "pending",
      });
    }

    if (fourMatchers.length > 0) {
      results.push({
        draw_id: drawData.id,
        match_type: "4-match",
        pool_amount: prizeDistribution["4-match"],
        winner_count: fourMatchers.length,
        amount_per_winner:
          prizeDistribution["4-match"] / fourMatchers.length,
        status: "pending",
      });
    }

    if (threeMatchers.length > 0) {
      results.push({
        draw_id: drawData.id,
        match_type: "3-match",
        pool_amount: prizeDistribution["3-match"],
        winner_count: threeMatchers.length,
        amount_per_winner:
          prizeDistribution["3-match"] / threeMatchers.length,
        status: "pending",
      });
    }

    // Insert results
    if (results.length > 0) {
      const { error: resultsError } = await supabase
        .from("draw_results")
        .insert(results);

      if (resultsError) throw resultsError;
    }

    return {
      drawId: drawData.id,
      drawNumbers,
      matches: {
        fiveMatchers,
        fourMatchers,
        threeMatchers,
      },
      prizes: {
        "5-match": prizeDistribution["5-match"],
        "4-match": prizeDistribution["4-match"],
        "3-match": prizeDistribution["3-match"],
      },
    };
  } catch (error) {
    console.error("Error creating draw:", error);
    throw error;
  }
}

/**
 * Publish draw results
 */
export async function publishDraw(drawId: string) {
  try {
    const { error } = await supabase
      .from("draws")
      .update({ status: "published" })
      .eq("id", drawId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error publishing draw:", error);
    throw error;
  }
}

/**
 * Get draws for a specific period
 */
export async function getDraws(
  startDate?: Date,
  endDate?: Date
) {
  try {
    let query = supabase.from("draws").select("*");

    if (startDate) {
      query = query.gte(
        "draw_date",
        startDate.toISOString().split("T")[0]
      );
    }

    if (endDate) {
      query = query.lte("draw_date", endDate.toISOString().split("T")[0]);
    }

    const { data, error } = await query.order("draw_date", {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching draws:", error);
    return [];
  }
}
