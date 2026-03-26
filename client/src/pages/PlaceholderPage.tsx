import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-background pt-24 px-4">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary">
            GolfFlow
          </Link>
          <Link to="/" className="text-primary hover:text-primary/80">
            Back Home
          </Link>
        </div>
      </nav>

      <div className="container max-w-4xl mx-auto py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">{title}</h1>
          {description && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-8 space-y-6">
          <p className="text-foreground">
            GolfFlow helps golfers track recent scores, enter draw rounds, and
            support charities through their subscription. This page is available
            in the app and can be expanded further, but it is no longer a dead
            end.
          </p>
          <p className="text-muted-foreground">
            If you need details about billing, account changes, privacy, or
            support, use the main navigation to access your dashboard, charity
            selection, subscription page, or admin tools.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
