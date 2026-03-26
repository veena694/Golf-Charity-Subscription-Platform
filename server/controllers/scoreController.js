const supabase = require("../lib/supabase");
const { sendBadRequest } = require("../lib/http");

exports.getScores = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("golf_scores")
      .select("*")
      .eq("user_id", userId)
      .order("score_date", { ascending: false })
      .limit(5);

    if (error) throw error;

    res.json({ scores: data || [] });
  } catch (error) {
    console.error("Get scores error:", error);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
};

exports.addScore = async (req, res) => {
  try {
    const { userId, score, scoreDate, courseName } = req.body;
    const numericScore = Number(score);

    if (!userId || score === undefined || !scoreDate) {
      return sendBadRequest(res, "userId, score and scoreDate are required");
    }

    if (!Number.isInteger(numericScore) || numericScore < 1 || numericScore > 45) {
      return sendBadRequest(res, "score must be an integer between 1 and 45");
    }

    const { data: scores, error: scoresError } = await supabase
      .from("golf_scores")
      .select("*")
      .eq("user_id", userId)
      .order("score_date", { ascending: true });

    if (scoresError) throw scoresError;

    if ((scores || []).length >= 5) {
      await supabase.from("golf_scores").delete().eq("id", scores[0].id);
    }

    const { data, error } = await supabase
      .from("golf_scores")
      .insert({
        user_id: userId,
        score: numericScore,
        score_date: scoreDate,
        course_name: typeof courseName === "string" ? courseName.trim() || null : null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ score: data });
  } catch (error) {
    console.error("Add score error:", error);
    res.status(500).json({ error: "Failed to add score" });
  }
};

exports.updateScore = async (req, res) => {
  try {
    const { scoreId } = req.params;
    const { score, scoreDate, courseName } = req.body;
    const numericScore = Number(score);

    if (!scoreId || score === undefined || !scoreDate) {
      return sendBadRequest(res, "scoreId, score and scoreDate are required");
    }

    if (!Number.isInteger(numericScore) || numericScore < 1 || numericScore > 45) {
      return sendBadRequest(res, "score must be an integer between 1 and 45");
    }

    const { data, error } = await supabase
      .from("golf_scores")
      .update({
        score: numericScore,
        score_date: scoreDate,
        course_name: typeof courseName === "string" ? courseName.trim() || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scoreId)
      .select()
      .single();

    if (error) throw error;

    res.json({ score: data });
  } catch (error) {
    console.error("Update score error:", error);
    res.status(500).json({ error: "Failed to update score" });
  }
};
