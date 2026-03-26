const express = require("express");
const supabase = require("../lib/supabase");
const { sendBadRequest } = require("../lib/http");
const { ADMIN_EMAIL } = require("../lib/admin");
const { sendWelcomeEmail } = require("../lib/email");

const router = express.Router();

router.get("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendBadRequest(res, "id is required");
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    res.json({ profile: data || null });
  } catch (error) {
    console.error("Auth profile fetch error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

router.post("/sync-profile", async (req, res) => {
  try {
    const { id, email, fullName } = req.body;

    if (!id || !email) {
      return sendBadRequest(res, "id and email are required");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const isAdmin = normalizedEmail === ADMIN_EMAIL;
    const { data: existingProfile } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("users")
      .upsert(
        [
          {
            id,
            email: normalizedEmail,
            full_name:
              String(fullName || "").trim() ||
              normalizedEmail.split("@")[0] ||
              "Member",
            role: isAdmin ? "admin" : "subscriber",
            subscription_status: isAdmin ? "active" : "inactive",
          },
        ],
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) throw error;

    if (!existingProfile && !isAdmin) {
      void sendWelcomeEmail({
        email: normalizedEmail,
        fullName: data.full_name,
      }).catch((emailError) => {
        console.error("Welcome email error:", emailError);
      });
    }

    res.json({ profile: data });
  } catch (error) {
    console.error("Auth profile sync error:", error);
    res.status(500).json({ error: "Failed to sync user profile" });
  }
});

module.exports = router;
