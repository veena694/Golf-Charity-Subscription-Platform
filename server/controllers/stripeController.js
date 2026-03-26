const stripe = require("../lib/stripe");
const { sendBadRequest } = require("../lib/http");
const {
  sendSubscriptionEmail,
  sendSubscriptionStatusEmail,
} = require("../lib/email");

exports.createCheckout = async (req, res) => {
  try {
    const { userId, planType } = req.body;

    if (!userId || !["monthly", "yearly"].includes(planType)) {
      return sendBadRequest(res, "userId and a valid planType are required");
    }

    const priceId =
      planType === "monthly"
        ? "price_1TEaAp7dCZyLzTiRQpfuag5Y"
        : "price_1TEaDI7dCZyLzTiRkmG9eQB2";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.CLIENT_URL}/subscribe?checkout=cancelled`,
      client_reference_id: userId,
      metadata: {
        planType,
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe error" });
  }
};

exports.createDonationCheckout = async (req, res) => {
  try {
    const { charityId, charityName, amount, userId } = req.body;
    const numericAmount = Number(amount);

    if (!charityId || !charityName || !Number.isFinite(numericAmount) || numericAmount < 1) {
      return sendBadRequest(res, "charityId, charityName and amount are required");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Independent donation to ${charityName}`,
            },
            unit_amount: Math.round(numericAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/charities?donation=success`,
      cancel_url: `${process.env.CLIENT_URL}/charities?donation=cancelled`,
      client_reference_id: userId || null,
      metadata: {
        donationType: "independent",
        charityId,
        charityName,
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe donation error" });
  }
};

exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.log("Webhook Error:", err.message);
    return res.sendStatus(400);
  }

  const supabase = require("../lib/supabase");

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.mode === "subscription" && session.client_reference_id) {
      const endDate = getSubscriptionEndDate(session.metadata?.planType);

      const { error: subscriptionError } = await supabase.from("subscriptions").upsert(
        {
          user_id: session.client_reference_id,
          stripe_subscription_id: session.subscription,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );
      if (subscriptionError) throw subscriptionError;

      const { error: userError } = await supabase
        .from("users")
        .update({
          subscription_status: "active",
          subscription_plan: session.metadata?.planType || null,
          subscription_end_date: endDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.client_reference_id);
      if (userError) throw userError;

      const { data: userProfile } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", session.client_reference_id)
        .maybeSingle();

      if (userProfile?.email) {
        void sendSubscriptionEmail({
          email: userProfile.email,
          fullName: userProfile.full_name,
          planType: session.metadata?.planType,
          endDate,
        }).catch((emailError) => {
          console.error("Subscription activation email error:", emailError);
        });
      }
    }

    if (session.mode === "payment" && session.metadata?.donationType === "independent") {
      try {
        await supabase.from("donations").insert({
          user_id: session.client_reference_id || null,
          charity_id: session.metadata?.charityId || null,
          charity_name: session.metadata?.charityName || null,
          amount: Number(session.amount_total || 0) / 100,
          payment_intent_id: session.payment_intent || null,
          status: "paid",
        });
      } catch (error) {
        console.error("Donation logging warning:", error);
      }
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    const normalizedStatus = normalizeSubscriptionStatus(subscription.status);
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const { data: subscriptionRow, error: lookupError } = await supabase
      .from("subscriptions")
      .select("id, user_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .update({
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (subscriptionError) throw subscriptionError;

    if (subscriptionRow?.user_id) {
      const { error: userError } = await supabase
        .from("users")
        .update({
          subscription_status: normalizedStatus,
          subscription_end_date: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionRow.user_id);

      if (userError) throw userError;

      const { data: userProfile } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", subscriptionRow.user_id)
        .maybeSingle();

      if (userProfile?.email) {
        void sendSubscriptionStatusEmail({
          email: userProfile.email,
          fullName: userProfile.full_name,
          status: normalizedStatus,
          endDate: periodEnd,
        }).catch((emailError) => {
          console.error("Subscription status email error:", emailError);
        });
      }
    }
  }

  return res.sendStatus(200);
};

function getSubscriptionEndDate(planType) {
  const now = new Date();
  if (planType === "yearly") {
    now.setFullYear(now.getFullYear() + 1);
    return now.toISOString();
  }

  now.setMonth(now.getMonth() + 1);
  return now.toISOString();
}

function normalizeSubscriptionStatus(stripeStatus) {
  if (["active", "trialing"].includes(stripeStatus)) {
    return "active";
  }

  if (stripeStatus === "canceled") {
    return "cancelled";
  }

  if (["past_due", "unpaid", "incomplete_expired"].includes(stripeStatus)) {
    return "expired";
  }

  return "inactive";
}
