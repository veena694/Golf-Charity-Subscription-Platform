const supabase = require("../lib/supabase");

module.exports = async (req, res, next) => {
  const userId = req.user.id;

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!data) {
    return res.status(403).json({
      error: "Subscription required",
    });
  }

  next();
};