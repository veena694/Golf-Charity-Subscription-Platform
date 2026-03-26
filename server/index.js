require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { assertConfig, getAllowedOrigins } = require("./lib/config");
const { ensureAdminUser } = require("./lib/admin");
const stripeRoutes = require("./routes/stripe");
const authRoutes = require("./routes/auth");
const charityRoutes = require("./routes/charities");
const scoreRoutes = require("./routes/scores");
const subscriptionRoutes = require("./routes/subscription");
const drawRoutes = require("./routes/draws");
const adminRoutes = require("./routes/admin");
const { handleWebhook } = require("./controllers/stripeController");

assertConfig();

const app = express();

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("PROMISE ERROR:", err);
});


app.use(cors({
  origin: "https://golfcharitysubscriptionplatform-chi.vercel.app",
  credentials: true
}));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/charities", charityRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/draws", drawRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/*splat", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

app.use((err, _req, res, _next) => {
  console.error("REQUEST ERROR:", err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT || 3000);

async function startServer() {
  await ensureAdminUser();

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("SERVER STARTUP ERROR:", error);
  process.exit(1);
});
