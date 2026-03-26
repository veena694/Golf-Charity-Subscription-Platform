import { Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Subscription engine",
    points: [
      "Choose a monthly or yearly plan through Stripe checkout.",
      "A portion of every active subscription funds both charity impact and monthly prize pools.",
      "Subscription state is synced from Stripe webhook events so active, cancelled, expired, and renewal windows stay visible in the app.",
    ],
  },
  {
    title: "Score experience",
    points: [
      "Enter Stableford scores between 1 and 45 with a round date.",
      "Only your latest five scores are retained.",
      "New scores automatically replace the oldest score once you already have five.",
    ],
  },
  {
    title: "Monthly draw engine",
    points: [
      "Admins can simulate draws before publishing them.",
      "Published draws split prize pools across 5-match, 4-match, and 3-match tiers.",
      "Unclaimed 5-match jackpots roll into the next draw automatically.",
    ],
  },
  {
    title: "Charity impact",
    points: [
      "Select your preferred charity as part of your member profile.",
      "Increase your charity percentage through your saved profile data.",
      "Make independent donations to listed charities outside the subscription flow.",
    ],
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background pt-24 px-4 pb-20">
      <div className="container max-w-6xl mx-auto">
        <div className="max-w-3xl mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-4">
            How It Works
          </p>
          <h1 className="text-5xl font-bold text-foreground mb-4">
            A golf platform built around impact, not golf cliches
          </h1>
          <p className="text-lg text-muted-foreground">
            GolfFlow combines golf score tracking, charity support, and a monthly
            draw engine into one modern subscription experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {sections.map((section) => (
            <Card key={section.title} className="p-6 bg-card border border-border">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.points.map((point) => (
                  <p key={point} className="text-muted-foreground">
                    {point}
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-8 bg-gradient-to-r from-primary/10 to-charity/10 border border-border">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            What a subscriber sees
          </h2>
          <p className="text-muted-foreground mb-6">
            Subscription status, latest five scores, selected charity, draw entry
            summary, winnings, winner proof submission, and account settings all
            live inside the dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/subscribe">View Plans</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/charities">Explore Charities</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
