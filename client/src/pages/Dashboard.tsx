import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Heart, Pencil, Plus, TrendingUp, Trophy, Upload } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/api";
import { Charity, fetchCharities } from "@/lib/charities";
import { fetchUserDrawSummary, UserDrawSummary } from "@/lib/draws";

interface GolfScore {
  id: string;
  user_id: string;
  score: number;
  score_date: string;
  course_name: string | null;
  created_at: string;
}

interface WinnerRecord {
  id: string;
  draw_result_id: string;
  winning_numbers: number[];
  created_at: string;
}

interface VerificationRecord {
  id: string;
  draw_winner_id: string;
  proof_screenshot_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface PayoutRecord {
  id: string;
  draw_winner_id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  payment_date: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [scores, setScores] = useState<GolfScore[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [winnings, setWinnings] = useState<WinnerRecord[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [drawSummary, setDrawSummary] = useState<UserDrawSummary | null>(null);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [drawLoading, setDrawLoading] = useState(true);
  const [charityLoading, setCharityLoading] = useState(false);
  const [proofSavingId, setProofSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [newScore, setNewScore] = useState({
    score: "",
    scoreDate: format(new Date(), "yyyy-MM-dd"),
    courseName: "",
  });
  const [savedCharityId, setSavedCharityId] = useState(
    userProfile?.selected_charity_id || "",
  );
  const [selectedCharityId, setSelectedCharityId] = useState(
    userProfile?.selected_charity_id || "",
  );
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScoreForm, setEditScoreForm] = useState({
    score: "",
    scoreDate: "",
    courseName: "",
  });
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;

    const loadScores = async () => {
      try {
        const response = await apiGet<{ scores: GolfScore[] }>(
          `/api/scores/${user.id}`,
        );
        setScores(response.scores || []);
      } catch (error) {
        console.error("Error loading scores:", error);
        toast({
          title: "Error",
          description: "Failed to load your golf scores.",
          variant: "destructive",
        });
      } finally {
        setScoresLoading(false);
      }
    };

    void loadScores();
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;

    const loadDrawSummary = async () => {
      try {
        const data = await fetchUserDrawSummary(user.id);
        setDrawSummary(data);
      } catch (error) {
        console.error("Error loading draw summary:", error);
        toast({
          title: "Error",
          description: "Failed to load monthly draw details.",
          variant: "destructive",
        });
      } finally {
        setDrawLoading(false);
      }
    };

    void loadDrawSummary();
  }, [user, toast]);

  useEffect(() => {
    const loadCharities = async () => {
      try {
        const data = await fetchCharities();
        setCharities(data);
      } catch (error) {
        console.error("Error loading charities:", error);
        toast({
          title: "Error",
          description: "Failed to load charities.",
          variant: "destructive",
        });
      }
    };

    void loadCharities();
  }, [toast]);

  useEffect(() => {
    if (!user) return;

    const loadWinnings = async () => {
      try {
        const data = await apiGet<{
          winners: WinnerRecord[];
          verifications: VerificationRecord[];
          payouts: PayoutRecord[];
        }>(`/api/draws/winnings/${user.id}`);
        setWinnings(data.winners || []);
        setVerifications(data.verifications || []);
        setPayouts(data.payouts || []);
      } catch (error) {
        console.error("Error loading winnings:", error);
      }
    };

    void loadWinnings();
  }, [user]);

  useEffect(() => {
    setSavedCharityId(userProfile?.selected_charity_id || "");
    setSelectedCharityId(userProfile?.selected_charity_id || "");
  }, [userProfile?.selected_charity_id]);

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;
    if (!newScore.score || Number.isNaN(Number.parseInt(newScore.score, 10))) {
      toast({
        title: "Error",
        description: "Please enter a valid score.",
        variant: "destructive",
      });
      return;
    }

    const scoreNum = Number.parseInt(newScore.score, 10);
    if (scoreNum < 1 || scoreNum > 45) {
      toast({
        title: "Error",
        description: "Golf scores must be between 1 and 45.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiPost<{ score: GolfScore }>("/api/scores", {
        userId: user.id,
        score: scoreNum,
        scoreDate: newScore.scoreDate,
        courseName: newScore.courseName || undefined,
      });

      if (response.score) {
        setScores((current) => [response.score, ...current].slice(0, 5));
        setNewScore({
          score: "",
          scoreDate: format(new Date(), "yyyy-MM-dd"),
          courseName: "",
        });
        toast({
          title: "Success",
          description: "Golf score added successfully.",
        });
      }
    } catch (error) {
      console.error("Error adding score:", error);
      toast({
        title: "Error",
        description: "Failed to add golf score.",
        variant: "destructive",
      });
    }
  };

  const handleSaveCharity = async () => {
    if (!user) return;
    if (!selectedCharityId) {
      toast({
        title: "Error",
        description: "Please select a charity first.",
        variant: "destructive",
      });
      return;
    }

    setCharityLoading(true);
    try {
      await apiPost("/api/subscription/charity", {
        userId: user.id,
        charityId: selectedCharityId,
        contributionPercentage: userProfile?.charity_contribution_percentage || 10,
      });
      setSavedCharityId(selectedCharityId);
      await refreshProfile();
      toast({
        title: "Success",
        description: "Charity selection saved.",
      });
    } catch (error) {
      console.error("Error updating charity:", error);
      toast({
        title: "Error",
        description: "Failed to update charity selection.",
        variant: "destructive",
      });
    } finally {
      setCharityLoading(false);
    }
  };

  const startEditingScore = (score: GolfScore) => {
    setEditingScoreId(score.id);
    setEditScoreForm({
      score: String(score.score),
      scoreDate: score.score_date,
      courseName: score.course_name || "",
    });
  };

  const handleUpdateScore = async (scoreId: string) => {
    if (!editScoreForm.score || !editScoreForm.scoreDate) {
      toast({
        title: "Error",
        description: "Score and date are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiPost<{ score: GolfScore }>(`/api/scores/${scoreId}`, {
        score: Number(editScoreForm.score),
        scoreDate: editScoreForm.scoreDate,
        courseName: editScoreForm.courseName || undefined,
      });
      setScores((current) =>
        current.map((item) => (item.id === scoreId ? response.score : item)),
      );
      setEditingScoreId(null);
      toast({
        title: "Success",
        description: "Golf score updated.",
      });
    } catch (error) {
      console.error("Error updating score:", error);
      toast({
        title: "Error",
        description: "Failed to update score.",
        variant: "destructive",
      });
    }
  };

  const handleUploadProof = async (winnerId: string) => {
    const proofUrl = String(proofInputs[winnerId] || "").trim();

    if (!proofUrl) {
      toast({
        title: "Error",
        description: "Enter a proof link or file URL first.",
        variant: "destructive",
      });
      return;
    }

    setProofSavingId(winnerId);
    try {
      const response = await apiPost<{ verification: VerificationRecord }>("/api/draws/proof", {
        drawWinnerId: winnerId,
        proofUrl,
      });
      setVerifications((current) => {
        const existing = current.find((item) => item.draw_winner_id === winnerId);
        if (existing) {
          return current.map((item) =>
            item.draw_winner_id === winnerId ? response.verification : item,
          );
        }
        return [response.verification, ...current];
      });
      toast({
        title: "Success",
        description: "Winner proof submitted for review.",
      });
    } catch (error) {
      console.error("Error uploading proof:", error);
      toast({
        title: "Error",
        description: "Failed to upload winner proof.",
        variant: "destructive",
      });
    } finally {
      setProofSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
          <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary">
              GolfFlow
            </Link>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </nav>

        <div className="pt-28 px-4">
          <div className="container max-w-3xl mx-auto">
            <Card className="p-8 bg-card border border-border text-center">
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Sign in to access your dashboard
              </h1>
              <p className="text-muted-foreground mb-6">
                Log in to view your scores, manage your profile, and update your
                charity selection.
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/login">Go to Login</Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
          <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary">
              GolfFlow
            </Link>
            <AccountMenu />
          </div>
        </nav>

        <div className="pt-28 px-4">
          <div className="container max-w-3xl mx-auto">
            <Card className="p-8 bg-card border border-border text-center">
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Setting up your dashboard
              </h1>
              <p className="text-muted-foreground mb-6">
                Your account is signed in, but your profile is still loading or being
                created. Refresh once your user record is available in Supabase.
              </p>
              <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90">
                Refresh Dashboard
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const selectedCharity = charities.find((charity) => charity.id === savedCharityId);
  const pendingCharity = charities.find((charity) => charity.id === selectedCharityId);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary">
            GolfFlow
          </Link>
          <AccountMenu
            onProfile={() => setActiveTab("settings")}
            labelClassName="text-sm text-muted-foreground"
          />
        </div>
      </nav>

      <div className="pt-20 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Welcome, {userProfile.full_name.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground">
              {userProfile.subscription_status === "active"
                ? "Your subscription is active"
                : "You do not have an active subscription"}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Subscription</h3>
                <div
                  className={`w-3 h-3 rounded-full ${
                    userProfile.subscription_status === "active"
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                />
              </div>
              <p className="text-2xl font-bold text-foreground capitalize mb-2">
                {userProfile.subscription_status}
              </p>
              <p className="text-sm text-muted-foreground">
                {userProfile.subscription_plan === "monthly"
                  ? "Monthly plan"
                  : userProfile.subscription_plan === "yearly"
                    ? "Yearly plan"
                    : "No plan selected"}
              </p>
              {userProfile.subscription_end_date && (
                <p className="text-xs text-muted-foreground mt-2">
                  Ends: {format(new Date(userProfile.subscription_end_date), "MMM dd, yyyy")}
                </p>
              )}
            </Card>

            <Card className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Latest Score</h3>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              {scores.length > 0 ? (
                <>
                  <p className="text-2xl font-bold text-foreground mb-2">
                    {scores[0].score}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(scores[0].score_date), "MMM dd, yyyy")}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No scores yet</p>
              )}
            </Card>

            <Card className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Supporting Charity</h3>
                <Heart className="h-5 w-5 text-charity" />
              </div>
              {selectedCharity ? (
                <>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {selectedCharity.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userProfile.charity_contribution_percentage}% of your subscription
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No charity selected</p>
              )}
            </Card>

            <Card className="p-6 bg-card border border-border md:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Monthly Prize Pool</h3>
                <Trophy className="h-5 w-5 text-charity" />
              </div>
              {drawLoading ? (
                <p className="text-muted-foreground">Loading monthly draw status...</p>
              ) : drawSummary ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">{drawSummary.eligibility.message}</p>
                  {drawSummary.latestDraw ? (
                    <div className="rounded-lg border border-border bg-background p-4">
                      <p className="text-sm font-semibold text-foreground">
                        Latest published draw: {format(new Date(drawSummary.latestDraw.draw_date), "MMMM dd, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Numbers: {drawSummary.latestDraw.draw_numbers.join(", ")} | Prize pool: GBP{" "}
                        {drawSummary.latestDraw.total_pool_amount.toFixed(2)}
                      </p>
                      {drawSummary.latestDraw.rolloverAmount ? (
                        <p className="text-sm text-muted-foreground">
                          Jackpot rollover applied: GBP {drawSummary.latestDraw.rolloverAmount.toFixed(2)}
                        </p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        {drawSummary.latestDraw.isWinner
                          ? "You had a winning match in this draw."
                          : `Your best matched tier: ${drawSummary.latestDraw.userMatches}/5`}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No published draw has been posted yet.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No draw summary available.</p>
              )}
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-20">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="draws">Draws</TabsTrigger>
              <TabsTrigger value="winnings">Winnings</TabsTrigger>
              <TabsTrigger value="charity">Charity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Recent Golf Scores
                </h3>
                {scoresLoading ? (
                  <p className="text-muted-foreground">Loading scores...</p>
                ) : scores.length > 0 ? (
                  <div className="space-y-2">
                    {scores.slice(0, 5).map((score) => (
                      <div
                        key={score.id}
                        className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                      >
                        <div>
                          <p className="font-semibold text-foreground">Score: {score.score}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(score.score_date), "MMM dd, yyyy")}
                          </p>
                          {score.course_name && (
                            <p className="text-xs text-muted-foreground">
                              {score.course_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No scores recorded yet. Start by adding your first score.
                  </p>
                )}
              </Card>

              {winnings.length > 0 && (
                <Card className="p-6 bg-card border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-charity" />
                    Your Winnings
                  </h3>
                  <p className="text-muted-foreground">
                    You have {winnings.length} wins in the draw history.
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="scores" className="space-y-6">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Add New Score
                </h3>
                <form onSubmit={handleAddScore} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="score" className="text-foreground">
                        Stableford Score (1-45)
                      </Label>
                      <Input
                        id="score"
                        type="number"
                        min="1"
                        max="45"
                        placeholder="Enter your score"
                        value={newScore.score}
                        onChange={(e) =>
                          setNewScore({ ...newScore, score: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scoreDate" className="text-foreground">
                        Date
                      </Label>
                      <Input
                        id="scoreDate"
                        type="date"
                        value={newScore.scoreDate}
                        onChange={(e) =>
                          setNewScore({ ...newScore, scoreDate: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="courseName" className="text-foreground">
                      Course Name (Optional)
                    </Label>
                    <Input
                      id="courseName"
                      type="text"
                      placeholder="e.g., St Andrews"
                      value={newScore.courseName}
                      onChange={(e) =>
                        setNewScore({ ...newScore, courseName: e.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Score
                  </Button>
                </form>
              </Card>

              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Your Latest 5 Scores
                </h3>
                {scoresLoading ? (
                  <p className="text-muted-foreground">Loading scores...</p>
                ) : scores.length > 0 ? (
                  <div className="space-y-3">
                    {scores.map((score) => (
                      <div
                        key={score.id}
                        className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          {editingScoreId === score.id ? (
                            <div className="space-y-3">
                              <Input
                                type="number"
                                min="1"
                                max="45"
                                value={editScoreForm.score}
                                onChange={(e) =>
                                  setEditScoreForm((current) => ({
                                    ...current,
                                    score: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                type="date"
                                value={editScoreForm.scoreDate}
                                onChange={(e) =>
                                  setEditScoreForm((current) => ({
                                    ...current,
                                    scoreDate: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                type="text"
                                placeholder="Course name"
                                value={editScoreForm.courseName}
                                onChange={(e) =>
                                  setEditScoreForm((current) => ({
                                    ...current,
                                    courseName: e.target.value,
                                  }))
                                }
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void handleUpdateScore(score.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingScoreId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-semibold text-foreground">
                                {score.score} points
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(score.score_date), "EEEE, MMM dd")}
                              </p>
                              {score.course_name && (
                                <p className="text-xs text-muted-foreground">
                                  {score.course_name}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        {editingScoreId !== score.id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditingScore(score)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No scores yet. Add one above.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="draws" className="space-y-6">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Monthly Draw Participation
                </h3>
                {drawLoading ? (
                  <p className="text-muted-foreground">Loading monthly draw details...</p>
                ) : drawSummary ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-background p-4">
                      <p className="font-semibold text-foreground mb-1">Entry Status</p>
                      <p className="text-sm text-muted-foreground">
                        {drawSummary.eligibility.message}
                      </p>
                    </div>
                    {drawSummary.recentDraws.length > 0 ? (
                      <div className="space-y-3">
                        {drawSummary.recentDraws.map((draw) => (
                          <div
                            key={draw.id}
                            className="rounded-lg border border-border bg-background p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-foreground">
                                  {format(new Date(draw.draw_date), "MMMM dd, yyyy")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Draw numbers: {draw.draw_numbers.join(", ")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Total pool: GBP {draw.total_pool_amount.toFixed(2)}
                                </p>
                                {draw.rolloverAmount ? (
                                  <p className="text-sm text-muted-foreground">
                                    Jackpot rollover: GBP {draw.rolloverAmount.toFixed(2)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-foreground">
                                  {draw.isWinner ? "Winner" : `${draw.userMatches}/5 matches`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {draw.status}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No published monthly draws yet.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No monthly draw information found.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="winnings" className="space-y-6">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  View Participation & Winnings
                </h3>
                {winnings.length > 0 ? (
                  <div className="space-y-4">
                    {winnings.map((winner) => {
                      const verification = verifications.find(
                        (item) => item.draw_winner_id === winner.id,
                      );
                      const payout = payouts.find((item) => item.draw_winner_id === winner.id);

                      return (
                        <div
                          key={winner.id}
                          className="rounded-lg border border-border bg-background p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-foreground">
                                Winning numbers: {winner.winning_numbers.join(", ")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Won on {format(new Date(winner.created_at), "MMMM dd, yyyy")}
                              </p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>Verification: {verification?.status || "pending"}</p>
                              <p>Payout: {payout?.status || "pending"}</p>
                              <p>
                                Amount: GBP {payout ? payout.amount.toFixed(2) : "0.00"}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-foreground">Upload Winner Proof</Label>
                            <Input
                              type="text"
                              placeholder="Paste screenshot or proof URL"
                              value={proofInputs[winner.id] ?? verification?.proof_screenshot_url ?? ""}
                              onChange={(e) =>
                                setProofInputs((current) => ({
                                  ...current,
                                  [winner.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              onClick={() => void handleUploadProof(winner.id)}
                              disabled={proofSavingId === winner.id}
                              className="bg-primary hover:bg-primary/90"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {proofSavingId === winner.id ? "Submitting..." : "Submit Proof"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    You have no winnings yet. When you win a draw, your proof submission and payout status will appear here.
                  </p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="charity" className="space-y-6">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Select Your Charity
                </h3>
                {charities.length > 0 ? (
                  <div className="space-y-3">
                    {charities.map((charity) => (
                      <label
                        key={charity.id}
                        className="flex items-center gap-4 p-4 bg-background rounded-lg border-2 cursor-pointer transition"
                        style={{
                          borderColor:
                            selectedCharityId === charity.id
                              ? "hsl(166, 78%, 42%)"
                              : "hsl(220, 13%, 91%)",
                          backgroundColor:
                            selectedCharityId === charity.id
                              ? "hsl(166, 78%, 42%, 0.05)"
                              : undefined,
                        }}
                      >
                        <input
                          type="radio"
                          name="charity"
                          value={charity.id}
                          checked={selectedCharityId === charity.id}
                          onChange={() => setSelectedCharityId(charity.id)}
                          disabled={charityLoading}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {charity.name}
                          </p>
                          {charity.description && (
                            <p className="text-sm text-muted-foreground">
                              {charity.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No charities available.</p>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    onClick={() => void handleSaveCharity()}
                    disabled={
                      charityLoading ||
                      !selectedCharityId ||
                      selectedCharityId === savedCharityId
                    }
                    className="bg-primary hover:bg-primary/90"
                  >
                    {charityLoading ? "Saving..." : "Save Charity"}
                  </Button>
                  {selectedCharityId && selectedCharityId !== savedCharityId && pendingCharity ? (
                    <p className="text-sm text-muted-foreground">
                      Selected: <span className="font-semibold text-foreground">{pendingCharity.name}</span>. Click
                      {" "}Save Charity to store it in your account.
                    </p>
                  ) : null}
                </div>

                {selectedCharity && (
                  <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">
                        {userProfile.charity_contribution_percentage}%
                      </span>{" "}
                      of your subscription (
                      {userProfile.subscription_plan === "monthly"
                        ? "GBP 29.99/month"
                        : "GBP 299.99/year"}
                      ) will go to{" "}
                      <span className="font-semibold">{selectedCharity.name}</span>.
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Account Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-semibold text-foreground">
                      {userProfile.full_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-semibold text-foreground">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <p className="font-semibold text-foreground capitalize">
                      {userProfile.role}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Member Since</Label>
                    <p className="font-semibold text-foreground">
                      {format(new Date(userProfile.created_at), "MMMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
