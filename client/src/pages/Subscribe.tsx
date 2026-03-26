import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api";

export default function Subscribe() {
  const navigate = useNavigate();
  const { user, isSubscriber } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | null>(
    null,
  );

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    if (!user) {
      navigate("/signup");
      return;
    }

    if (isSubscriber) {
      toast({
        title: "Already Subscribed",
        description: "You already have an active subscription.",
      });
      return;
    }

    setLoading(true);
    setSelectedPlan(plan);

    try {
      const { checkoutUrl } = await apiPost<{ checkoutUrl: string }>(
        "/api/stripe/create-checkout",
        {
          userId: user.id,
          planType: plan,
        },
      );

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout process.",
        variant: "destructive",
      });
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 px-4">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <Link to="/" className="text-2xl font-bold text-primary">
            GolfFlow
          </Link>
        </div>
      </nav>

      <div className="container max-w-7xl mx-auto py-20">
        <div className="mb-8">
          <Link
            to="/"
            className="flex items-center text-primary hover:text-primary/80 transition"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back Home
          </Link>
        </div>

        <h1 className="text-5xl font-bold text-foreground mb-4 text-center">
          Choose Your Plan
        </h1>
        <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-16">
          Select a subscription plan and start your journey with GolfFlow.
          <br />
          All plans include access to all features and charity contributions.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <div className="border-2 border-border rounded-xl p-8 hover:border-primary transition bg-card">
            <h3 className="text-2xl font-bold text-foreground mb-2">Monthly</h3>
            <p className="text-muted-foreground mb-6">Perfect for trying it out</p>
            <div className="mb-6">
              <span className="text-5xl font-bold text-foreground">GBP 29.99</span>
              <span className="text-muted-foreground ml-2">/month</span>
            </div>

            <Button
              onClick={() => handleSubscribe("monthly")}
              disabled={loading && selectedPlan === "monthly"}
              className="w-full bg-primary hover:bg-primary/90 mb-8"
            >
              {loading && selectedPlan === "monthly"
                ? "Processing..."
                : "Subscribe Monthly"}
            </Button>

            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                Golf score tracking
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                Monthly draws
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                Charity selection
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                Winner verification
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                Community access
              </li>
            </ul>
          </div>

          <div className="border-2 border-primary rounded-xl p-8 bg-primary/5 relative">
            <div className="absolute top-0 left-4 bg-charity text-white px-4 py-1 rounded-full text-sm font-semibold">
              Save 17%
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-2 mt-4">
              Yearly
            </h3>
            <p className="text-muted-foreground mb-6">
              Best value for committed players
            </p>
            <div className="mb-6">
              <span className="text-5xl font-bold text-foreground">GBP 299.99</span>
              <span className="text-muted-foreground ml-2">/year</span>
            </div>

            <Button
              onClick={() => handleSubscribe("yearly")}
              disabled={loading && selectedPlan === "yearly"}
              className="w-full bg-primary hover:bg-primary/90 mb-8"
            >
              {loading && selectedPlan === "yearly"
                ? "Processing..."
                : "Subscribe Yearly"}
            </Button>

            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                Everything in Monthly
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                12 months of draws
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                Priority support
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                Exclusive community
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                Early draw results
              </li>
            </ul>
          </div>
        </div>

        {!user && (
          <div className="bg-card border border-border rounded-lg p-8 text-center max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Ready to Subscribe?
            </h3>
            <p className="text-muted-foreground mb-6">
              You need to create an account first.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/signup">Create Account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/login">Already have an account?</Link>
              </Button>
            </div>
          </div>
        )}

        {isSubscriber && (
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-8 text-center max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-primary mb-4">
              Already Subscribed
            </h3>
            <p className="text-foreground mb-6">
              You have an active subscription. Head to your dashboard to manage
              your account.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
