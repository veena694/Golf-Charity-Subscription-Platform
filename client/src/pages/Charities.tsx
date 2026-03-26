import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api";
import { Charity, fetchCharities } from "@/lib/charities";

export default function Charities() {
  const { user, userProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [filteredCharities, setFilteredCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [donatingId, setDonatingId] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState("25");
  const [selectedCharityId, setSelectedCharityId] = useState(
    userProfile?.selected_charity_id || "",
  );

  const loadCharities = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await fetchCharities();
      setCharities(data);
      setFilteredCharities(data);
    } catch (error) {
      console.error("Error loading charities:", error);
      const message =
        error instanceof Error ? error.message : "Failed to load charities.";

      setCharities([]);
      setFilteredCharities([]);
      setLoadError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadCharities();
  }, [loadCharities]);

  useEffect(() => {
    const filtered = charities.filter(
      (charity) =>
        charity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        charity.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredCharities(filtered);
  }, [searchTerm, charities]);

  useEffect(() => {
    setSelectedCharityId(userProfile?.selected_charity_id || "");
  }, [userProfile?.selected_charity_id]);

  const handleSelectCharity = async (charityId: string) => {
    if (!user) return;

    setSelectingId(charityId);
    try {
      await apiPost("/api/subscription/charity", {
        userId: user.id,
        charityId,
        contributionPercentage: userProfile?.charity_contribution_percentage || 10,
      });
      setSelectedCharityId(charityId);
      await refreshProfile();
      toast({
        title: "Charity updated",
        description: "Your selected charity has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update charity selection.",
        variant: "destructive",
      });
    } finally {
      setSelectingId(null);
    }
  };

  const handleDonate = async (charity: Charity) => {
    const numericAmount = Number(donationAmount);
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      toast({
        title: "Error",
        description: "Enter a valid donation amount.",
        variant: "destructive",
      });
      return;
    }

    setDonatingId(charity.id);
    try {
      const response = await apiPost<{ checkoutUrl: string }>(
        "/api/stripe/create-donation-checkout",
        {
          charityId: charity.id,
          charityName: charity.name,
          amount: numericAmount,
          userId: user?.id,
        },
      );

      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start donation checkout.",
        variant: "destructive",
      });
      setDonatingId(null);
    }
  };

  const featuredCharities = filteredCharities.filter((charity) => charity.featured);
  const otherCharities = filteredCharities.filter((charity) => !charity.featured);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary">
            GolfFlow
          </Link>
          {user ? (
            <Link
              to="/dashboard"
              className="text-primary hover:text-primary/80 transition"
            >
              Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/subscribe">Subscribe</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>

      <div className="pt-24 px-4 pb-20">
        <div className="container max-w-7xl mx-auto">
          <div className="mb-12">
            <Link
              to="/"
              className="flex items-center text-primary hover:text-primary/80 transition mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back Home
            </Link>
            <h1 className="text-5xl font-bold text-foreground mb-4">
              Our Charities
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Choose a charity you care about and help make a real impact. Your
              subscription contribution goes directly to the cause you believe in.
            </p>
          </div>

          <div className="mb-12">
            <div className="mb-8 rounded-xl border border-border bg-card p-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Make an independent donation
              </h2>
              <p className="text-muted-foreground mb-4">
                Support any listed charity directly, even outside the subscription prize flow.
              </p>
              <div className="flex max-w-xs items-center gap-3">
                <span className="text-sm text-muted-foreground">GBP</span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search charities..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center">
              <p className="text-muted-foreground">Loading charities...</p>
            </div>
          ) : loadError ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                {loadError}
              </p>
              <Button onClick={() => void loadCharities()}>
                Retry
              </Button>
            </div>
          ) : filteredCharities.length === 0 ? (
            <div className="text-center">
              <p className="text-muted-foreground">No charities found.</p>
            </div>
          ) : (
            <>
              {featuredCharities.length > 0 && (
                <div className="mb-16">
                  <h2 className="text-3xl font-bold text-foreground mb-8">
                    Featured
                  </h2>
                  <div className="grid md:grid-cols-2 gap-8">
                    {featuredCharities.map((charity) => (
                      <div
                        key={charity.id}
                        className="bg-card border-2 border-primary rounded-xl overflow-hidden hover:shadow-lg transition"
                      >
                        {charity.image_url ? (
                          <div
                            className="h-48 bg-gradient-to-br from-primary/20 to-charity/20"
                            style={{
                              backgroundImage: `url(${charity.image_url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          />
                        ) : (
                          <div className="h-48 bg-gradient-to-br from-primary/20 to-charity/20 flex items-center justify-center">
                            <Heart className="h-12 w-12 text-charity opacity-20" />
                          </div>
                        )}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-xl font-bold text-foreground">
                              {charity.name}
                            </h3>
                            <span className="inline-block bg-charity/20 text-charity text-xs font-semibold px-3 py-1 rounded-full">
                              Featured
                            </span>
                          </div>
                          {charity.description && (
                            <p className="text-muted-foreground mb-4 line-clamp-3">
                              {charity.description}
                            </p>
                          )}
                          <div className="flex gap-3">
                            {charity.website_url && (
                              <Button variant="outline" size="sm" asChild className="flex-1">
                                <a
                                  href={charity.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Learn More
                                </a>
                              </Button>
                            )}
                            {user ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => void handleDonate(charity)}
                                  disabled={donatingId === charity.id}
                                >
                                  {donatingId === charity.id ? "Opening..." : "Donate"}
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 bg-primary hover:bg-primary/90"
                                  onClick={() => handleSelectCharity(charity.id)}
                                  disabled={
                                    selectingId === charity.id ||
                                    selectedCharityId === charity.id
                                  }
                                >
                                  {selectingId === charity.id
                                    ? "Saving..."
                                    : selectedCharityId === charity.id
                                      ? "Selected"
                                      : "Select"}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => void handleDonate(charity)}
                                  disabled={donatingId === charity.id}
                                >
                                  {donatingId === charity.id ? "Opening..." : "Donate"}
                                </Button>
                                <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90" asChild>
                                  <Link to="/subscribe">Subscribe</Link>
                                </Button>
                              </>
                            )}
                          </div>
                          {charity.upcoming_events && charity.upcoming_events.length > 0 ? (
                            <div className="mt-4 rounded-lg border border-border bg-background p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                Upcoming Events
                              </p>
                              <div className="space-y-2">
                                {charity.upcoming_events.slice(0, 2).map((event, index) => (
                                  <div key={`${charity.id}-featured-event-${index}`}>
                                    <p className="text-sm font-medium text-foreground">
                                      {event.title || "Charity event"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {[event.date, event.location].filter(Boolean).join(" | ")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otherCharities.length > 0 && (
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-8">
                    All Charities
                  </h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    {otherCharities.map((charity) => (
                      <div
                        key={charity.id}
                        className="bg-card border rounded-lg overflow-hidden hover:border-primary hover:shadow-lg transition"
                        style={{
                          borderColor:
                            selectedCharityId === charity.id
                              ? "hsl(166, 78%, 42%)"
                              : undefined,
                        }}
                      >
                        {charity.image_url ? (
                          <div
                            className="h-40 bg-gradient-to-br from-primary/20 to-charity/20"
                            style={{
                              backgroundImage: `url(${charity.image_url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          />
                        ) : (
                          <div className="h-40 bg-gradient-to-br from-primary/20 to-charity/20 flex items-center justify-center">
                            <Heart className="h-10 w-10 text-charity opacity-20" />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-bold text-foreground mb-2">
                            {charity.name}
                          </h3>
                          {charity.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {charity.description}
                            </p>
                          )}
                          <div className="flex gap-2 flex-col">
                            {charity.website_url && (
                              <Button variant="outline" size="sm" className="w-full" asChild>
                                <a
                                  href={charity.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Learn More
                                </a>
                              </Button>
                            )}
                            {user ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => void handleDonate(charity)}
                                  disabled={donatingId === charity.id}
                                >
                                  {donatingId === charity.id ? "Opening..." : "Donate"}
                                </Button>
                                <Button
                                  size="sm"
                                  className="w-full bg-primary hover:bg-primary/90"
                                  onClick={() => handleSelectCharity(charity.id)}
                                  disabled={
                                    selectingId === charity.id ||
                                    selectedCharityId === charity.id
                                  }
                                >
                                  {selectingId === charity.id
                                    ? "Saving..."
                                    : selectedCharityId === charity.id
                                      ? "Selected"
                                      : "Select"}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => void handleDonate(charity)}
                                  disabled={donatingId === charity.id}
                                >
                                  {donatingId === charity.id ? "Opening..." : "Donate"}
                                </Button>
                                <Button size="sm" className="w-full bg-primary hover:bg-primary/90" asChild>
                                  <Link to="/subscribe">Subscribe</Link>
                                </Button>
                              </>
                            )}
                          </div>
                          {charity.upcoming_events && charity.upcoming_events.length > 0 ? (
                            <div className="mt-3 rounded-lg border border-border bg-background p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                Upcoming Events
                              </p>
                              <div className="space-y-2">
                                {charity.upcoming_events.slice(0, 2).map((event, index) => (
                                  <div key={`${charity.id}-event-${index}`}>
                                    <p className="text-sm font-medium text-foreground">
                                      {event.title || "Charity event"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {[event.date, event.location].filter(Boolean).join(" | ")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
