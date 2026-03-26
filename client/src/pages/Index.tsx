import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Heart,
  Trophy,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AccountMenu } from "@/components/account-menu";
import { fetchPublicDraws, PublicDraw } from "@/lib/draws";
import { Charity, fetchFeaturedCharities } from "@/lib/charities";

export default function Index() {
  const { user } = useAuth();
  const [draws, setDraws] = useState<PublicDraw[]>([]);
  const [featuredCharities, setFeaturedCharities] = useState<Charity[]>([]);
  const featuredCharityCards: Charity[] =
    featuredCharities.length > 0
      ? featuredCharities
      : [
          {
            id: "placeholder-featured",
            name: "Featured charity coming soon",
            description:
              "Your selected causes will appear here once charities are configured in the admin panel.",
            image_url: null,
            website_url: null,
            featured: true,
            impact_summary: null,
            upcoming_events: [],
          },
        ];

  useEffect(() => {
    const loadDraws = async () => {
      try {
        const data = await fetchPublicDraws();
        setDraws(data);
      } catch (error) {
        console.error("Error loading public draws:", error);
      }
    };

    void loadDraws();
  }, []);

  useEffect(() => {
    const loadFeaturedCharities = async () => {
      try {
        const data = await fetchFeaturedCharities();
        setFeaturedCharities(data);
      } catch (error) {
        console.error("Error loading featured charities:", error);
      }
    };

    void loadFeaturedCharities();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary">
            GolfFlow
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/charities" className="text-foreground hover:text-primary transition">
              Charities
            </Link>
            <Link to="/about" className="text-foreground hover:text-primary transition">
              How It Works
            </Link>
            {user ? (
              <AccountMenu />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button className="bg-primary hover:bg-primary/90" asChild>
                  <Link to="/subscribe">Subscribe Now</Link>
                </Button>
              </>
            )}
          </div>
          <div className="md:hidden flex items-center gap-2">
            {user ? (
              <AccountMenu />
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button className="bg-primary hover:bg-primary/90 text-sm" asChild>
                  <Link to="/subscribe">Subscribe</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-charity rounded-full blur-3xl" />
        </div>

        <div className="container max-w-7xl mx-auto text-center animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Score for <span className="text-primary">Good</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Track your golf scores, compete monthly, and support charities you care
            about. Every round matters.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6" asChild>
              <Link to="/subscribe">
                Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-2 border-muted hover:bg-muted"
              asChild
            >
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-card">
        <div className="container max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="bg-background rounded-xl p-8 border border-border hover:border-primary transition">
                <div className="mb-6 inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-lg">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Track</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Enter your last 5 golf scores in Stableford format. Watch your
                  progress and keep your recent rounds visible.
                </p>
              </div>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="bg-background rounded-xl p-8 border border-border hover:border-charity transition">
                <div className="mb-6 inline-flex items-center justify-center w-14 h-14 bg-charity/10 rounded-lg">
                  <Trophy className="h-7 w-7 text-charity" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Win</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Compete in monthly draws with prize pools that grow with the
                  community.
                </p>
              </div>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <div className="bg-background rounded-xl p-8 border border-border hover:border-primary transition">
                <div className="mb-6 inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-lg">
                  <Heart className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Give</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Choose a charity you care about. A portion of every subscription
                  automatically supports your chosen cause.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="max-w-3xl mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Participate In Monthly Prize Pools
            </h2>
            <p className="text-lg text-muted-foreground">
              Active subscribers are entered into monthly draw-based prize pools. Your
              latest five scores are matched against each published draw, and prize
              money is split across 5-match, 4-match, and 3-match winners.
            </p>
          </div>

          {draws.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {draws.map((draw) => (
                <div key={draw.id} className="rounded-xl border border-border bg-card p-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    {new Date(draw.draw_date).toLocaleDateString()}
                  </p>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    Prize Pool GBP {draw.total_pool_amount.toFixed(2)}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Draw numbers: {draw.draw_numbers.join(", ")}
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>5-match pool: GBP {draw.five_match_pool.toFixed(2)}</p>
                    {draw.rolloverAmount ? (
                      <p>Jackpot rollover: GBP {draw.rolloverAmount.toFixed(2)}</p>
                    ) : null}
                    <p>4-match pool: GBP {draw.four_match_pool.toFixed(2)}</p>
                    <p>3-match pool: GBP {draw.three_match_pool.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-muted-foreground">
                Monthly prize pool details will appear here as soon as the first draw is
                published.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { number: "1", title: "Subscribe", description: "Choose monthly or yearly plan" },
              { number: "2", title: "Score", description: "Log your latest 5 golf scores" },
              { number: "3", title: "Compete", description: "Enter monthly draws automatically" },
              { number: "4", title: "Impact", description: "Support charities while you play" },
            ].map((step) => (
              <div key={step.number} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
                  <span className="text-2xl font-bold text-primary">{step.number}</span>
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{step.title}</h4>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-card">
        <div className="container max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            Choose the plan that works best for you. Both include access to all
            features and automatic charity contributions.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="border-2 border-border rounded-xl p-8 hover:border-primary transition">
              <h3 className="text-2xl font-bold text-foreground mb-2">Monthly</h3>
              <p className="text-muted-foreground mb-6">Perfect for trying it out</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">GBP 29.99</span>
                <span className="text-muted-foreground ml-2">/month</span>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90 mb-6" asChild>
                <Link to="/subscribe">Start Monthly</Link>
              </Button>
            </div>

            <div className="border-2 border-primary rounded-xl p-8 relative bg-primary/5">
              <div className="absolute top-0 left-4 bg-charity text-white px-4 py-1 rounded-full text-sm font-semibold">
                Save 17%
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2 mt-4">Yearly</h3>
              <p className="text-muted-foreground mb-6">Best value for committed players</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">GBP 299.99</span>
                <span className="text-muted-foreground ml-2">/year</span>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90 mb-6" asChild>
                <Link to="/subscribe">Start Yearly</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-foreground mb-4">
            Support Causes You Care About
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Choose from our curated selection of charities. A minimum of 10% of your
            subscription goes directly to your chosen cause.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredCharityCards.map((charity) => (
              <div key={charity.id} className="bg-card border border-border rounded-lg p-6">
                <div
                  className="w-full h-40 bg-gradient-to-br from-primary/20 to-charity/20 rounded-lg mb-4"
                  style={charity.image_url ? {
                    backgroundImage: `url(${charity.image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  } : undefined}
                />
                <h3 className="text-lg font-semibold text-foreground mb-2">{charity.name}</h3>
                <p className="text-muted-foreground text-sm">
                  {charity.impact_summary || charity.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary/10"
              asChild
            >
              <Link to="/charities">
                Explore All Charities <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 to-charity/10 border-t border-border">
        <div className="container max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ready to Make an Impact?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join golfers who are playing for a purpose. Your next round matters.
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6" asChild>
            <Link to="/subscribe">
              Subscribe Now <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
