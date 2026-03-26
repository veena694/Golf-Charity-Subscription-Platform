const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "CLIENT_URL",
];

function assertConfig() {
  const missing = requiredEnvVars.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function getAllowedOrigins() {
  return [
    process.env.CLIENT_URL,
    "http://localhost:5173", 
  ];
}

module.exports = {
  assertConfig,
  getAllowedOrigins,
};
