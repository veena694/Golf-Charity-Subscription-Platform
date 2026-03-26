const express = require("express");
const supabase = require("../lib/supabase");
const { sendBadRequest } = require("../lib/http");
const {
  sendPayoutEmail,
  sendWinnerVerificationEmail,
} = require("../lib/email");

const router = express.Router();

router.get("/overview", async (_req, res) => {
  try {
    const [usersResult, subscriptionsResult, charitiesResult] =
      await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("charities").select("*", { count: "exact", head: true }),
      ]);

    res.json({
      totalUsers: usersResult.count || 0,
      activeSubscriptions: subscriptionsResult.count || 0,
      totalCharities: charitiesResult.count || 0,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({ error: "Failed to fetch admin overview" });
  }
});

router.get("/reports", async (_req, res) => {
  try {
    const [
      usersResult,
      subscriptionsResult,
      charitiesResult,
      drawsResult,
      payoutsResult,
      verificationsResult,
    ] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("subscriptions").select("*"),
      supabase.from("charities").select("*"),
      supabase.from("draws").select("*"),
      supabase.from("payouts").select("*"),
      supabase.from("winner_verifications").select("*"),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (subscriptionsResult.error) throw subscriptionsResult.error;
    if (charitiesResult.error) throw charitiesResult.error;
    if (drawsResult.error) throw drawsResult.error;
    if (payoutsResult.error) throw payoutsResult.error;
    if (verificationsResult.error) throw verificationsResult.error;

    const users = usersResult.data || [];
    const subscriptions = subscriptionsResult.data || [];
    const charities = charitiesResult.data || [];
    const draws = drawsResult.data || [];
    const payouts = payoutsResult.data || [];
    const verifications = verificationsResult.data || [];

    const totalPrizePool = draws.reduce(
      (sum, draw) => sum + Number(draw.total_pool_amount || 0),
      0,
    );
    const charityContributionTotal = users.reduce((sum, user) => {
      if (user.subscription_status !== "active") return sum;

      const planValue =
        user.subscription_plan === "yearly"
          ? 299.99
          : user.subscription_plan === "monthly"
            ? 29.99
            : 0;
      const contributionRate = Number(user.charity_contribution_percentage || 10) / 100;
      return sum + planValue * contributionRate;
    }, 0);

    res.json({
      totalUsers: users.length,
      activeSubscriptions: subscriptions.filter((item) => item.status === "active").length,
      inactiveUsers: users.filter((item) => item.subscription_status !== "active").length,
      totalCharities: charities.length,
      featuredCharities: charities.filter((item) => item.featured).length,
      totalPrizePool,
      charityContributionTotal,
      drawStatistics: {
        totalDraws: draws.length,
        publishedDraws: draws.filter((item) =>
          ["published", "completed"].includes(item.status),
        ).length,
        pendingDraws: draws.filter((item) => item.status === "pending").length,
      },
      winnerStatistics: {
        pendingVerifications: verifications.filter((item) => item.status === "pending").length,
        approvedVerifications: verifications.filter((item) => item.status === "approved").length,
        pendingPayouts: payouts.filter((item) => item.status === "pending").length,
        paidPayouts: payouts.filter((item) => item.status === "paid").length,
      },
    });
  } catch (error) {
    console.error("Admin reports error:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ users: data || [] });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, role, subscriptionStatus, subscriptionPlan } = req.body;

    if (!id) {
      return sendBadRequest(res, "User id is required");
    }

    const payload = {
      updated_at: new Date().toISOString(),
    };

    if (typeof fullName === "string" && fullName.trim()) {
      payload.full_name = fullName.trim();
    }

    if (["admin", "subscriber", "public"].includes(role)) {
      payload.role = role;
    }

    if (["active", "inactive", "cancelled", "expired"].includes(subscriptionStatus)) {
      payload.subscription_status = subscriptionStatus;
    }

    if (["monthly", "yearly"].includes(subscriptionPlan)) {
      payload.subscription_plan = subscriptionPlan;
    } else if (subscriptionPlan === null) {
      payload.subscription_plan = null;
    }

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ user: data });
  } catch (error) {
    console.error("Admin update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.get("/subscriptions", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ subscriptions: data || [] });
  } catch (error) {
    console.error("Admin subscriptions error:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

router.post("/subscriptions/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !["active", "inactive", "cancelled", "expired"].includes(status)) {
      return sendBadRequest(res, "A valid subscription id and status are required");
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (data?.user_id) {
      await supabase
        .from("users")
        .update({
          subscription_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.user_id);
    }

    res.json({ subscription: data });
  } catch (error) {
    console.error("Admin update subscription error:", error);
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

router.get("/charities", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("charities")
      .select("*")
      .order("featured", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;

    res.json({ charities: data || [] });
  } catch (error) {
    console.error("Admin charities error:", error);
    res.status(500).json({ error: "Failed to fetch charities" });
  }
});

router.post("/charities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, websiteUrl, featured = false } = req.body;

    if (!id || !name) {
      return sendBadRequest(res, "Charity id and name are required");
    }

    const { data, error } = await supabase
      .from("charities")
      .update({
        name: String(name).trim(),
        description: description?.trim() || null,
        image_url: imageUrl?.trim() || null,
        website_url: websiteUrl?.trim() || null,
        featured: Boolean(featured),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ charity: data });
  } catch (error) {
    console.error("Update charity error:", error);
    res.status(500).json({ error: "Failed to update charity" });
  }
});

router.post("/charities", async (req, res) => {
  try {
    const { name, description, imageUrl, websiteUrl, featured = false } =
      req.body;

    if (!name) {
      return sendBadRequest(res, "Charity name is required");
    }

    const { data, error } = await supabase
      .from("charities")
      .insert([
        {
          name: String(name).trim(),
          description: description?.trim() || null,
          image_url: imageUrl?.trim() || null,
          website_url: websiteUrl?.trim() || null,
          featured: Boolean(featured),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ charity: data });
  } catch (error) {
    console.error("Create charity error:", error);
    res.status(500).json({ error: "Failed to create charity" });
  }
});

router.post("/charities/:id/delete", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendBadRequest(res, "Charity id is required");
    }

    const { error } = await supabase.from("charities").delete().eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Delete charity error:", error);
    res.status(500).json({ error: "Failed to delete charity" });
  }
});

router.get("/winners", async (_req, res) => {
  try {
    const [winnersResult, verificationsResult, payoutsResult] =
      await Promise.all([
        supabase.from("draw_winners").select("*").order("created_at", {
          ascending: false,
        }),
        supabase
          .from("winner_verifications")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("payouts").select("*").order("created_at", {
          ascending: false,
        }),
      ]);

    if (winnersResult.error) throw winnersResult.error;
    if (verificationsResult.error) throw verificationsResult.error;
    if (payoutsResult.error) throw payoutsResult.error;

    res.json({
      winners: winnersResult.data || [],
      verifications: verificationsResult.data || [],
      payouts: payoutsResult.data || [],
    });
  } catch (error) {
    console.error("Admin winners error:", error);
    res.status(500).json({ error: "Failed to fetch winner data" });
  }
});

router.post("/verifications/:id/approve", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("winner_verifications")
      .update({ status: "approved", verified_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ verification: data });
    void notifyWinnerVerificationChange(data, "approved").catch((emailError) => {
      console.error("Winner approval email error:", emailError);
    });
  } catch (error) {
    console.error("Approve verification error:", error);
    res.status(500).json({ error: "Failed to approve verification" });
  }
});

router.post("/verifications/:id/reject", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("winner_verifications")
      .update({ status: "rejected" })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ verification: data });
    void notifyWinnerVerificationChange(data, "rejected").catch((emailError) => {
      console.error("Winner rejection email error:", emailError);
    });
  } catch (error) {
    console.error("Reject verification error:", error);
    res.status(500).json({ error: "Failed to reject verification" });
  }
});

router.post("/payouts/:id/mark-paid", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payouts")
      .update({ status: "paid", payment_date: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ payout: data });
    void notifyPayoutCompleted(data).catch((emailError) => {
      console.error("Payout completion email error:", emailError);
    });
  } catch (error) {
    console.error("Mark payout paid error:", error);
    res.status(500).json({ error: "Failed to mark payout as paid" });
  }
});

async function notifyWinnerVerificationChange(verification, status) {
  if (!verification?.draw_winner_id) return;

  const { data: winner, error: winnerError } = await supabase
    .from("draw_winners")
    .select("id, winner_user_id")
    .eq("id", verification.draw_winner_id)
    .maybeSingle();

  if (winnerError) throw winnerError;
  if (!winner?.winner_user_id) return;

  const [{ data: profile, error: profileError }, { data: payout }] = await Promise.all([
    supabase
      .from("users")
      .select("email, full_name")
      .eq("id", winner.winner_user_id)
      .maybeSingle(),
    supabase
      .from("payouts")
      .select("amount")
      .eq("draw_winner_id", verification.draw_winner_id)
      .maybeSingle(),
  ]);

  if (profileError) throw profileError;
  if (!profile?.email) return;

  await sendWinnerVerificationEmail({
    email: profile.email,
    fullName: profile.full_name,
    status,
    amount: payout?.amount,
  });
}

async function notifyPayoutCompleted(payout) {
  if (!payout?.draw_winner_id) return;

  const { data: winner, error: winnerError } = await supabase
    .from("draw_winners")
    .select("winner_user_id")
    .eq("id", payout.draw_winner_id)
    .maybeSingle();

  if (winnerError) throw winnerError;
  if (!winner?.winner_user_id) return;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", winner.winner_user_id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.email) return;

  await sendPayoutEmail({
    email: profile.email,
    fullName: profile.full_name,
    amount: payout.amount,
  });
}

module.exports = router;
