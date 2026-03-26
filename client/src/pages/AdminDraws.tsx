import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Zap } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/api";

interface Draw {
  id: string;
  draw_date: string;
  draw_numbers: number[];
  status: "pending" | "published" | "completed";
  total_pool_amount: number;
  five_match_pool: number;
  four_match_pool: number;
  three_match_pool: number;
  created_at: string;
}

interface DrawSimulation {
  drawNumbers: number[];
  totalPoolAmount: number;
  rolloverAmount: number;
  prizePools: {
    "5-match": number;
    "4-match": number;
    "3-match": number;
  };
  matches: {
    fiveMatchers: number;
    fourMatchers: number;
    threeMatchers: number;
  };
}

export default function AdminDraws() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDraw, setCreatingDraw] = useState(false);
  const [simulatingDraw, setSimulatingDraw] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [simulation, setSimulation] = useState<DrawSimulation | null>(null);
  const [formData, setFormData] = useState({
    drawDate: format(new Date(), "yyyy-MM-dd"),
    drawMethod: "random" as "random" | "algorithmic",
    totalPoolAmount: "1000",
  });

  useEffect(() => {
    if (userProfile && userProfile.role !== "admin") {
      navigate("/");
    }
  }, [userProfile, navigate]);

  useEffect(() => {
    if (!user || userProfile?.role !== "admin") return;
    void reloadDraws();
  }, [user, userProfile]);

  const reloadDraws = async () => {
    try {
      const response = await apiGet<{ success: boolean; draws: Draw[] }>(
        "/api/draws",
      );
      setDraws((response.draws || []).slice(0, 20));
    } catch (error) {
      console.error("Error loading draws:", error);
      toast({
        title: "Error",
        description: "Failed to load draws.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDraw = async () => {
    setSimulatingDraw(true);

    try {
      const result = await apiPost<{ success: boolean; simulation: DrawSimulation }>(
        "/api/draws/simulate",
        {
          drawMethod: formData.drawMethod,
          totalPoolAmount: Number(formData.totalPoolAmount),
        },
      );

      setSimulation(result.simulation);
      toast({
        title: "Simulation ready",
        description: "Preview generated successfully. Review it before creating the live draw.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to simulate draw.",
        variant: "destructive",
      });
    } finally {
      setSimulatingDraw(false);
    }
  };

  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingDraw(true);

    try {
      const result = await apiPost<{
        success: boolean;
        warnings?: string[];
        matches: {
          fiveMatchers: number;
          fourMatchers: number;
          threeMatchers: number;
        };
      }>("/api/draws/create", {
        drawDate: formData.drawDate,
        drawMethod: formData.drawMethod,
        totalPoolAmount: Number(formData.totalPoolAmount),
        publishOnCreate: true,
      });

      toast({
        title: "Success",
        description:
          result.warnings && result.warnings.length > 0
            ? `Draw created and published for ${formData.drawDate}. ${result.warnings[0]}`
            : `Draw created and published for ${formData.drawDate}.`,
      });

      await reloadDraws();
      setShowCreateForm(false);
      setSimulation(null);
      setFormData({
        drawDate: format(new Date(), "yyyy-MM-dd"),
        drawMethod: "random",
        totalPoolAmount: "1000",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create draw.",
        variant: "destructive",
      });
    } finally {
      setCreatingDraw(false);
    }
  };

  const handlePublishDraw = async (drawId: string) => {
    try {
      await apiPost("/api/draws/publish", { drawId });
      toast({
        title: "Success",
        description: "Draw published successfully.",
      });
      await reloadDraws();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish draw.",
        variant: "destructive",
      });
    }
  };

  if (!user || userProfile?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-4">
      <div className="container max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            to="/admin"
            className="flex items-center text-primary hover:text-primary/80 transition mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Draw Management
          </h1>
          <p className="text-muted-foreground">
            Create and publish monthly draws
          </p>
        </div>

        {!showCreateForm ? (
          <Card className="p-6 bg-card border border-border mb-12">
            <Button
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Draw
            </Button>
          </Card>
        ) : (
          <Card className="p-6 bg-card border border-border mb-12">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              Create New Draw
            </h3>
            <form onSubmit={handleCreateDraw} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="drawDate" className="text-foreground">
                    Draw Date
                  </Label>
                  <Input
                    id="drawDate"
                    type="date"
                    value={formData.drawDate}
                    onChange={(e) =>
                      setFormData({ ...formData, drawDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drawMethod" className="text-foreground">
                    Draw Method
                  </Label>
                  <select
                    id="drawMethod"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    value={formData.drawMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        drawMethod: e.target.value as "random" | "algorithmic",
                      })
                    }
                  >
                    <option value="random">Random</option>
                    <option value="algorithmic">
                      Algorithmic (By Score Frequency)
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="poolAmount" className="text-foreground">
                  Total Pool Amount (GBP)
                </Label>
                <Input
                  id="poolAmount"
                  type="number"
                  min="100"
                  step="100"
                  value={formData.totalPoolAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalPoolAmount: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => void handleSimulateDraw()}
                  disabled={simulatingDraw}
                >
                  {simulatingDraw ? "Simulating..." : "Run Simulation"}
                </Button>
                <Button
                  type="submit"
                  disabled={creatingDraw}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {creatingDraw ? "Creating..." : "Create Draw"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>

            {simulation ? (
              <div className="mt-6 rounded-lg border border-border bg-background p-4 space-y-3">
                <p className="font-semibold text-foreground">Simulation Preview</p>
                <p className="text-sm text-muted-foreground">
                  Numbers: {simulation.drawNumbers.join(", ")}
                </p>
                {simulation.rolloverAmount > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Includes jackpot rollover: GBP {simulation.rolloverAmount.toFixed(2)}
                  </p>
                ) : null}
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="rounded border border-border p-3">
                    <p className="text-xs text-muted-foreground">5-match pool</p>
                    <p className="font-semibold text-foreground">
                      GBP {simulation.prizePools["5-match"].toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Winners: {simulation.matches.fiveMatchers}
                    </p>
                  </div>
                  <div className="rounded border border-border p-3">
                    <p className="text-xs text-muted-foreground">4-match pool</p>
                    <p className="font-semibold text-foreground">
                      GBP {simulation.prizePools["4-match"].toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Winners: {simulation.matches.fourMatchers}
                    </p>
                  </div>
                  <div className="rounded border border-border p-3">
                    <p className="text-xs text-muted-foreground">3-match pool</p>
                    <p className="font-semibold text-foreground">
                      GBP {simulation.prizePools["3-match"].toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Winners: {simulation.matches.threeMatchers}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        )}

        <Card className="p-6 bg-card border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Recent Draws
          </h3>

          {loading ? (
            <p className="text-muted-foreground">Loading draws...</p>
          ) : draws.length > 0 ? (
            <div className="space-y-4">
              {draws.map((draw) => (
                <div
                  key={draw.id}
                  className="p-4 bg-background rounded-lg border border-border"
                >
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold text-foreground">
                        {format(new Date(draw.draw_date), "EEEE, MMMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Draw Numbers</p>
                      <p className="font-semibold text-foreground">
                        {draw.draw_numbers.join(", ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          draw.status === "published"
                            ? "bg-primary/20 text-primary"
                            : draw.status === "completed"
                              ? "bg-charity/20 text-charity"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {draw.status.charAt(0).toUpperCase() + draw.status.slice(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pool</p>
                      <p className="font-semibold text-foreground">
                        GBP {draw.total_pool_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 mb-4 p-3 bg-muted rounded">
                    <div>
                      <p className="text-xs text-muted-foreground">5-Match Pool</p>
                      <p className="font-semibold text-foreground">
                        GBP {draw.five_match_pool.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">4-Match Pool</p>
                      <p className="font-semibold text-foreground">
                        GBP {draw.four_match_pool.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">3-Match Pool</p>
                      <p className="font-semibold text-foreground">
                        GBP {draw.three_match_pool.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {draw.status === "pending" && (
                    <Button
                      onClick={() => handlePublishDraw(draw.id)}
                      className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Publish Draw
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No draws created yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
