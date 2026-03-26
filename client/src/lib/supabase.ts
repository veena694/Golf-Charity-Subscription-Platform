import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log for debugging
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials missing. Environment variables:", {
    VITE_SUPABASE_URL: supabaseUrl ? "✓ Set" : "✗ Missing",
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? "✓ Set" : "✗ Missing",
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase credentials. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are set in your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get currently logged in user
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Helper function to get user profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  return data;
}

// Helper function to get user's latest 5 golf scores
export async function getUserGolfScores(userId: string) {
  const { data, error } = await supabase
    .from("golf_scores")
    .select("*")
    .eq("user_id", userId)
    .order("score_date", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching golf scores:", error);
    return [];
  }
  return data || [];
}

// Helper function to add golf score
export async function addGolfScore(
  userId: string,
  score: number,
  scoreDate: string,
  courseName?: string
) {
  // First, check if user already has 5 scores
  const existingScores = await getUserGolfScores(userId);

  if (existingScores.length >= 5) {
    // Delete the oldest score
    const oldestScore = existingScores[existingScores.length - 1];
    await supabase.from("golf_scores").delete().eq("id", oldestScore.id);
  }

  // Add new score
  const { data, error } = await supabase
    .from("golf_scores")
    .insert([
      {
        user_id: userId,
        score,
        score_date: scoreDate,
        course_name: courseName,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error adding golf score:", error);
    return null;
  }
  return data;
}

// Helper function to update golf score
export async function updateGolfScore(
  scoreId: string,
  score: number,
  scoreDate: string,
  courseName?: string
) {
  const { data, error } = await supabase
    .from("golf_scores")
    .update({
      score,
      score_date: scoreDate,
      course_name: courseName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scoreId)
    .select()
    .single();

  if (error) {
    console.error("Error updating golf score:", error);
    return null;
  }
  return data;
}

// Helper function to get all charities
export async function getAllCharities() {
  const { data, error } = await supabase
    .from("charities")
    .select("*")
    .order("featured", { ascending: false });

  if (error) {
    console.error("Error fetching charities:", error);
    return [];
  }
  return data || [];
}

// Helper function to get user's subscription
export async function getUserSubscription(userId: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (expected for new users)
    console.error("Error fetching subscription:", error);
  }
  return data || null;
}

// Helper function to update user's selected charity
export async function updateUserCharity(
  userId: string,
  charityId: string,
  contributionPercentage: number
) {
  const { data, error } = await supabase
    .from("users")
    .update({
      selected_charity_id: charityId,
      charity_contribution_percentage: contributionPercentage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user charity:", error);
    return null;
  }
  return data;
}

// Helper function to get current draw results
export async function getLatestDraws(limit = 3) {
  const { data, error } = await supabase
    .from("draws")
    .select("*")
    .order("draw_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching draws:", error);
    return [];
  }
  return data || [];
}

// Helper function to get user's winnings
export async function getUserWinnings(userId: string) {
  const { data, error } = await supabase
    .from("draw_winners")
    .select(
      `
    *,
    draw_result_id (
      match_type,
      pool_amount
    ),
    payouts (
      status,
      amount
    )
  `
    )
    .eq("winner_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user winnings:", error);
    return [];
  }
  return data || [];
}
