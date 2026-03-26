const express = require("express");
const supabase = require("../lib/supabase");
const { sendBadRequest } = require("../lib/http");
const { sendDrawPublishedEmail } = require("../lib/email");

const router = express.Router();

router.post("/simulate", async (req, res) => {
  try {
    const { drawMethod, totalPoolAmount } = req.body;
    const poolAmount = Number(totalPoolAmount);

    if (!drawMethod || totalPoolAmount === undefined) {
      return sendBadRequest(res, "drawMethod and totalPoolAmount are required");
    }

    if (!["random", "algorithmic"].includes(drawMethod)) {
      return sendBadRequest(res, "drawMethod must be random or algorithmic");
    }

    if (!Number.isFinite(poolAmount) || poolAmount <= 0) {
      return sendBadRequest(res, "totalPoolAmount must be a positive number");
    }

    const outcome = await buildDrawOutcome(drawMethod, poolAmount);

    res.json({
      success: true,
      simulation: {
        drawNumbers: outcome.drawNumbers,
        totalPoolAmount: poolAmount,
        prizePools: outcome.prizePools,
        rolloverAmount: outcome.rolloverAmount,
        matches: {
          fiveMatchers: outcome.groups["5-match"].length,
          fourMatchers: outcome.groups["4-match"].length,
          threeMatchers: outcome.groups["3-match"].length,
        },
      },
    });
  } catch (error) {
    console.error("Draw simulation error:", error);
    res.status(500).json({ error: error?.message || "Failed to simulate draw" });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { drawDate, drawMethod, totalPoolAmount, publishOnCreate = false } = req.body;
    const poolAmount = Number(totalPoolAmount);
    const warnings = [];

    if (!drawDate || !drawMethod || totalPoolAmount === undefined) {
      return sendBadRequest(res, "drawDate, drawMethod and totalPoolAmount are required");
    }

    if (!["random", "algorithmic"].includes(drawMethod)) {
      return sendBadRequest(res, "drawMethod must be random or algorithmic");
    }

    if (!Number.isFinite(poolAmount) || poolAmount <= 0) {
      return sendBadRequest(res, "totalPoolAmount must be a positive number");
    }

    const { drawNumbers, groups, prizePools, rolloverAmount } = await buildDrawOutcome(
      drawMethod,
      poolAmount,
    );

    const { data: drawData, error: drawError } = await supabase
      .from("draws")
      .insert([
        {
          draw_date: drawDate,
          draw_numbers: drawNumbers,
          draw_type: "5-number",
          status: publishOnCreate ? "published" : "pending",
          total_pool_amount: poolAmount,
          five_match_pool: prizePools["5-match"],
          four_match_pool: prizePools["4-match"],
          three_match_pool: prizePools["3-match"],
        },
      ])
      .select()
      .single();

    if (drawError) throw drawError;

    let drawResults = [];
    try {
      const { data, error: drawResultsError } = await supabase
        .from("draw_results")
        .insert(
          Object.entries(groups).map(([matchType, winners]) => ({
            draw_id: drawData.id,
            match_type: matchType,
            pool_amount: prizePools[matchType],
            winner_count: winners.length,
            amount_per_winner:
              winners.length > 0 ? prizePools[matchType] / winners.length : 0,
            status: publishOnCreate ? "published" : "pending",
          })),
        )
        .select("*");

      if (drawResultsError) throw drawResultsError;
      drawResults = data || [];
    } catch (error) {
      console.error("Draw results creation warning:", error);
      warnings.push("Draw stored, but result breakdown could not be created.");
    }

    const winnerRows = [];
    for (const result of drawResults || []) {
      const winners = groups[result.match_type] || [];
      winners.forEach((winner) => {
        winnerRows.push({
          winner_user_id: winner.userId,
          draw_result_id: result.id,
          winning_numbers: drawNumbers,
        });
      });
    }

    let createdWinners = [];
    if (winnerRows.length > 0) {
      try {
        const { data, error: winnersError } = await supabase
          .from("draw_winners")
          .insert(winnerRows)
          .select("*");

        if (winnersError) throw winnersError;
        createdWinners = data || [];
      } catch (error) {
        console.error("Draw winners creation warning:", error);
        warnings.push("Draw stored, but winner rows could not be created.");
      }
    }

    if (createdWinners.length > 0) {
      const verificationRows = [];
      const payoutRows = [];

      createdWinners.forEach((winner) => {
        const drawResult = (drawResults || []).find(
          (result) => result.id === winner.draw_result_id,
        );

        verificationRows.push({
          draw_winner_id: winner.id,
          status: "pending",
        });

        payoutRows.push({
          draw_winner_id: winner.id,
          amount: drawResult?.amount_per_winner || 0,
          status: "pending",
        });
      });

      try {
        const { error: verificationError } = await supabase
          .from("winner_verifications")
          .insert(verificationRows);
        if (verificationError) throw verificationError;

        const { error: payoutError } = await supabase
          .from("payouts")
          .insert(payoutRows);
        if (payoutError) throw payoutError;
      } catch (error) {
        console.error("Verification/payout creation warning:", error);
        warnings.push("Draw stored, but verification or payout rows could not be created.");
      }
    }

    res.json({
      success: true,
      draw: drawData,
      published: Boolean(publishOnCreate),
      rolloverAmount,
      warnings,
      matches: {
        fiveMatchers: groups["5-match"].length,
        fourMatchers: groups["4-match"].length,
        threeMatchers: groups["3-match"].length,
      },
    });

    if (publishOnCreate) {
      void notifySubscribersOfPublishedDraw(drawData).catch((emailError) => {
        console.error("Draw publish email error:", emailError);
      });
    }
  } catch (error) {
    console.error("Draw error:", error);
    res.status(500).json({ error: error?.message || "Failed to create draw" });
  }
});

router.post("/publish", async (req, res) => {
  try {
    const { drawId } = req.body;

    if (!drawId) {
      return sendBadRequest(res, "drawId is required");
    }

    const { data, error } = await supabase
      .from("draws")
      .update({ status: "published" })
      .eq("id", drawId)
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from("draw_results")
      .update({ status: "published" })
      .eq("draw_id", drawId);

    res.json({ success: true, draw: data });

    void notifySubscribersOfPublishedDraw(data).catch((emailError) => {
      console.error("Draw publish email error:", emailError);
    });
  } catch (error) {
    console.error("Publish draw error:", error);
    res.status(500).json({ error: "Failed to publish draw" });
  }
});

router.get("/public", async (_req, res) => {
  try {
    const draws = await fetchRecentPublishedDraws(3);
    res.json({ draws });
  } catch (error) {
    console.error("Public draws error:", error);
    res.status(500).json({ error: "Failed to fetch public draws" });
  }
});

router.get("/summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendBadRequest(res, "userId is required");
    }

    const [{ data: user, error: userError }, { data: scores, error: scoresError }] =
      await Promise.all([
        supabase
          .from("users")
          .select("id, subscription_status")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("golf_scores")
          .select("score")
          .eq("user_id", userId)
          .order("score_date", { ascending: false })
          .limit(5),
      ]);

    if (userError) throw userError;
    if (scoresError) throw scoresError;

    const recentDraws = await fetchRecentPublishedDraws(3, userId);
    const latestDraw = recentDraws[0] || null;
    const scoreCount = scores?.length || 0;
    const subscriptionActive = user?.subscription_status === "active";

    res.json({
      eligibility: {
        canParticipate: subscriptionActive,
        subscriptionActive,
        scoreCount,
        scoresNeeded: Math.max(0, 5 - scoreCount),
        message: subscriptionActive
          ? scoreCount >= 5
            ? "You are entered in the monthly draw with your latest 5 scores."
            : `You are entered in the monthly draw. Add ${Math.max(0, 5 - scoreCount)} more score${scoreCount === 4 ? "" : "s"} to complete your set of 5.`
          : "Activate a subscription to enter monthly prize pool draws.",
      },
      latestDraw,
      recentDraws,
    });
  } catch (error) {
    console.error("Draw summary error:", error);
    res.status(500).json({ error: "Failed to fetch draw summary" });
  }
});

router.get("/winnings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendBadRequest(res, "userId is required");
    }

    const [winnersResult, verificationsResult, payoutsResult] = await Promise.all([
      supabase
        .from("draw_winners")
        .select("*")
        .eq("winner_user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("winner_verifications")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("payouts")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (winnersResult.error) throw winnersResult.error;
    if (verificationsResult.error) throw verificationsResult.error;
    if (payoutsResult.error) throw payoutsResult.error;

    const winnerIds = new Set((winnersResult.data || []).map((winner) => winner.id));

    res.json({
      winners: winnersResult.data || [],
      verifications: (verificationsResult.data || []).filter((item) =>
        winnerIds.has(item.draw_winner_id),
      ),
      payouts: (payoutsResult.data || []).filter((item) =>
        winnerIds.has(item.draw_winner_id),
      ),
    });
  } catch (error) {
    console.error("User winnings error:", error);
    res.status(500).json({ error: "Failed to fetch winnings" });
  }
});

router.post("/proof", async (req, res) => {
  try {
    const { drawWinnerId, proofUrl } = req.body;

    if (!drawWinnerId || !proofUrl) {
      return sendBadRequest(res, "drawWinnerId and proofUrl are required");
    }

    const proofText = String(proofUrl).trim();
    if (!proofText) {
      return sendBadRequest(res, "proofUrl is required");
    }

    const { data, error } = await supabase
      .from("winner_verifications")
      .update({
        proof_screenshot_url: proofText,
        status: "pending",
        admin_notes: null,
        verified_at: null,
      })
      .eq("draw_winner_id", drawWinnerId)
      .select()
      .single();

    if (error) throw error;

    res.json({ verification: data });
  } catch (error) {
    console.error("Winner proof upload error:", error);
    res.status(500).json({ error: "Failed to upload winner proof" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("draws")
      .select("*")
      .order("draw_date", { ascending: false });

    if (error) throw error;

    res.json({ success: true, draws: data || [] });
  } catch (error) {
    console.error("Fetch draws error:", error);
    res.status(500).json({ error: "Failed to fetch draws" });
  }
});

async function fetchRecentPublishedDraws(limit, userId) {
  const { data: draws, error: drawsError } = await supabase
    .from("draws")
    .select("*")
    .in("status", ["published", "completed"])
    .order("draw_date", { ascending: false })
    .limit(limit);

  if (drawsError) throw drawsError;

  const drawIds = (draws || []).map((draw) => draw.id);
  if (drawIds.length === 0) {
    return [];
  }

  const [{ data: results, error: resultsError }, winnerPayload] = await Promise.all([
    supabase.from("draw_results").select("*").in("draw_id", drawIds),
    userId
      ? supabase
          .from("draw_winners")
          .select("draw_result_id")
          .eq("winner_user_id", userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (resultsError) throw resultsError;
  if (winnerPayload.error) throw winnerPayload.error;

  let scoreNumbers = [];
  if (userId) {
    const { data: userScores, error: userScoresError } = await supabase
      .from("golf_scores")
      .select("score")
      .eq("user_id", userId)
      .order("score_date", { ascending: false })
      .limit(5);

    if (userScoresError) throw userScoresError;
    scoreNumbers = (userScores || []).map((scoreRow) => scoreRow.score);
  }

  const resultsByDrawId = (results || []).reduce((acc, result) => {
    if (!acc[result.draw_id]) {
      acc[result.draw_id] = [];
    }
    acc[result.draw_id].push(result);
    return acc;
  }, {});

  const winnerResultIds = new Set(
    (winnerPayload.data || []).map((winner) => winner.draw_result_id),
  );

  return (draws || []).map((draw) => {
    const drawResults = resultsByDrawId[draw.id] || [];

    return {
      ...draw,
      results: drawResults,
      rolloverAmount: Math.max(
        0,
        Number(draw.five_match_pool || 0) - Number(draw.total_pool_amount || 0) * 0.4,
      ),
      userMatches: userId ? countMatches(scoreNumbers, draw.draw_numbers || []) : 0,
      isWinner: userId
        ? drawResults.some((result) => winnerResultIds.has(result.id))
        : false,
    };
  });
}

function generateRandomNumbers() {
  const numbers = [];
  while (numbers.length < 5) {
    const num = Math.floor(Math.random() * 45) + 1;
    if (!numbers.includes(num)) numbers.push(num);
  }
  return numbers.sort((a, b) => a - b);
}

async function getAlgorithmicNumbers() {
  const { data: scores, error } = await supabase.from("golf_scores").select("score");

  if (error) throw error;
  if (!scores || scores.length === 0) {
    return generateRandomNumbers();
  }

  const frequencies = {};
  scores.forEach((scoreRow) => {
    frequencies[scoreRow.score] = (frequencies[scoreRow.score] || 0) + 1;
  });

  const sorted = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .map((entry) => Number(entry[0]))
    .slice(0, 3);

  while (sorted.length < 5) {
    const num = Math.floor(Math.random() * 45) + 1;
    if (!sorted.includes(num)) sorted.push(num);
  }

  return sorted.sort((a, b) => a - b);
}

function countMatches(userScores, drawNumbers) {
  return drawNumbers.filter((number) => userScores.includes(number)).length;
}

async function notifySubscribersOfPublishedDraw(draw) {
  if (!draw) return;

  const { data: subscribers, error } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("subscription_status", "active")
    .not("email", "is", null);

  if (error) throw error;

  await Promise.all(
    (subscribers || []).map((subscriber) =>
      sendDrawPublishedEmail({
        email: subscriber.email,
        fullName: subscriber.full_name,
        drawDate: draw.draw_date,
        drawNumbers: draw.draw_numbers || [],
        totalPoolAmount: draw.total_pool_amount,
      }).catch((emailError) => {
        console.error(`Draw email failed for ${subscriber.email}:`, emailError);
      }),
    ),
  );
}

async function buildDrawOutcome(drawMethod, poolAmount) {
  const rolloverAmount = await getFiveMatchRolloverAmount();
  const drawNumbers =
    drawMethod === "random"
      ? generateRandomNumbers()
      : await getAlgorithmicNumbers();

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email")
    .eq("subscription_status", "active");

  if (usersError) throw usersError;

  const usersWithMatches = await Promise.all(
    (users || []).map(async (user) => {
      const { data: scores, error: scoresError } = await supabase
        .from("golf_scores")
        .select("score")
        .eq("user_id", user.id)
        .order("score_date", { ascending: false })
        .limit(5);

      if (scoresError) throw scoresError;

      const userScores = (scores || []).map((scoreRow) => scoreRow.score);
      return {
        userId: user.id,
        email: user.email,
        matches: countMatches(userScores, drawNumbers),
      };
    }),
  );

  const groups = {
    "5-match": usersWithMatches.filter((entry) => entry.matches === 5),
    "4-match": usersWithMatches.filter((entry) => entry.matches === 4),
    "3-match": usersWithMatches.filter((entry) => entry.matches === 3),
  };

  const prizePools = {
    "5-match": poolAmount * 0.4 + rolloverAmount,
    "4-match": poolAmount * 0.35,
    "3-match": poolAmount * 0.25,
  };

  return {
    drawNumbers,
    groups,
    prizePools,
    rolloverAmount,
  };
}

async function getFiveMatchRolloverAmount() {
  const { data, error } = await supabase
    .from("draw_results")
    .select("pool_amount, winner_count, status, match_type")
    .eq("match_type", "5-match")
    .eq("winner_count", 0)
    .in("status", ["published", "completed"]);

  if (error) throw error;

  return (data || []).reduce(
    (sum, row) => sum + Number(row.pool_amount || 0),
    0,
  );
}

module.exports = router;
