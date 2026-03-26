const express = require("express");
const supabase = require("../lib/supabase");
const { sendBadRequest } = require("../lib/http");

const router = express.Router();

router.get("/featured", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("charities")
      .select("*")
      .eq("featured", true)
      .order("name", { ascending: true })
      .limit(3);

    if (error) {
      throw error;
    }

    res.json({ charities: (data || []).map(normalizeCharity) });
  } catch (error) {
    console.error("Featured charities error:", error);
    res.status(500).json({ error: "Failed to fetch featured charities" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("charities")
      .select("*")
      .order("featured", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    res.json({ charities: (data || []).map(normalizeCharity) });
  } catch (error) {
    console.error("Public charities error:", error);
    res.status(500).json({ error: "Failed to fetch charities" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendBadRequest(res, "Charity id is required");
    }

    const { data, error } = await supabase
      .from("charities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: "Charity not found" });
    }

    res.json({ charity: normalizeCharity(data) });
  } catch (error) {
    console.error("Charity profile error:", error);
    res.status(500).json({ error: "Failed to fetch charity" });
  }
});

function normalizeCharity(charity) {
  return {
    ...charity,
    upcoming_events: normalizeEvents(charity?.upcoming_events),
  };
}

function normalizeEvents(events) {
  if (Array.isArray(events)) {
    return events;
  }

  if (typeof events === "string") {
    try {
      const parsed = JSON.parse(events);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  return [];
}

module.exports = router;
