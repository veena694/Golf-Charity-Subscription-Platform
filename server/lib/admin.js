const supabase = require("./supabase");

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@gmail.com")
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "admin@123");

async function ensureAdminUser() {
  const usersPage = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (usersPage.error) {
    throw usersPage.error;
  }

  const existingAuthUser = (usersPage.data?.users || []).find(
    (user) => String(user.email || "").trim().toLowerCase() === ADMIN_EMAIL,
  );

  let authUserId = existingAuthUser?.id;

  if (!authUserId) {
    const createResult = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Administrator",
      },
    });

    if (createResult.error) {
      throw createResult.error;
    }

    authUserId = createResult.data.user?.id;
  }

  if (authUserId) {
    const updateResult = await supabase.auth.admin.updateUserById(authUserId, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Administrator",
      },
    });

    if (updateResult.error) {
      throw updateResult.error;
    }
  }

  if (!authUserId) {
    throw new Error("Failed to resolve admin user id");
  }

  const { error: profileError } = await supabase.from("users").upsert(
    [
      {
        id: authUserId,
        email: ADMIN_EMAIL,
        full_name: "Administrator",
        role: "admin",
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }
}

module.exports = {
  ensureAdminUser,
  ADMIN_EMAIL,
};
