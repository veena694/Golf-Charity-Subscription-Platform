const express = require("express");
const supabase = require("../lib/supabase");
const { sendBadRequest } = require("../lib/http");

const router = express.Router();

router.get("/:userId", async (req, res) => {
  try {
    if (!req.params.userId) {
      return sendBadRequest(res, "userId is required");
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", req.params.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    res.json({ subscription: data || null });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

router.post("/charity", async (req, res) => {
  try {
    const { userId, charityId, contributionPercentage } = req.body;
    const numericContribution = Number(contributionPercentage || 10);

    if (!userId || !charityId) {
      return sendBadRequest(res, "userId and charityId are required");
    }

    if (!Number.isFinite(numericContribution) || numericContribution < 0 || numericContribution > 100) {
      return sendBadRequest(res, "contributionPercentage must be between 0 and 100");
    }

    const { data: charity, error: charityError } = await supabase
      .from("charities")
      .select("id, name")
      .eq("id", charityId)
      .maybeSingle();

    if (charityError) throw charityError;
    if (!charity) {
      return sendBadRequest(res, "Selected charity does not exist");
    }

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (existingUserError) throw existingUserError;

    const userPayload = {
      id: userId,
      email: existingUser?.email || null,
      full_name: existingUser?.full_name || "Member",
      role: existingUser?.role || "subscriber",
      subscription_status: existingUser?.subscription_status || "inactive",
      subscription_plan: existingUser?.subscription_plan || null,
      subscription_end_date: existingUser?.subscription_end_date || null,
      selected_charity_id: charityId,
      charity_contribution_percentage: numericContribution,
      created_at: existingUser?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("users")
      .upsert([userPayload], { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;

    res.json({ user: data, charity });
  } catch (error) {
    console.error("Update charity selection error:", error);
    res.status(500).json({ error: "Failed to update charity selection" });
  }
});

module.exports = router;
