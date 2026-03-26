import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPost } from "@/lib/api";

interface Winner {
  id: string;
  winner_user_id: string;
  winning_numbers: number[];
  created_at: string;
}

interface VerificationRecord {
  id: string;
  draw_winner_id: string;
  proof_screenshot_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  verified_at: string | null;
  created_at: string;
}

interface Payout {
  id: string;
  draw_winner_id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  payment_date: string | null;
  created_at: string;
}

export default function AdminWinners() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [winners, setWinners] = useState<Winner[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile && userProfile.role !== "admin") {
      navigate("/");
    }
  }, [userProfile, navigate]);

  useEffect(() => {
    if (!user || userProfile?.role !== "admin") return;
    void loadData();
  }, [user, userProfile]);

  const loadData = async () => {
    try {
      const response = await apiGet<{
        winners: Winner[];
        verifications: VerificationRecord[];
        payouts: Payout[];
      }>("/api/admin/winners");

      setWinners(response.winners || []);
      setVerifications(response.verifications || []);
      setPayouts(response.payouts || []);
    } catch (error) {
      console.error("Error loading winner data:", error);
      toast({
        title: "Error",
        description: "Failed to load winner data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVerification = async (verificationId: string) => {
    try {
      await apiPost(`/api/admin/verifications/${verificationId}/approve`);
      toast({
        title: "Success",
        description: "Winner verification approved.",
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve verification.",
        variant: "destructive",
      });
    }
  };

  const handleRejectVerification = async (verificationId: string) => {
    try {
      await apiPost(`/api/admin/verifications/${verificationId}/reject`);
      toast({
        title: "Success",
        description: "Winner verification rejected.",
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject verification.",
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async (payoutId: string) => {
    try {
      await apiPost(`/api/admin/payouts/${payoutId}/mark-paid`);
      toast({
        title: "Success",
        description: "Payout marked as paid.",
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark payout as paid.",
        variant: "destructive",
      });
    }
  };

  if (!user || userProfile?.role !== "admin") {
    return null;
  }

  const pendingVerifications = verifications.filter((item) => item.status === "pending");
  const approvedVerifications = verifications.filter((item) => item.status === "approved");
  const pendingPayouts = payouts.filter((item) => item.status === "pending");
  const paidPayouts = payouts.filter((item) => item.status === "paid");

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
            Winners & Payouts
          </h1>
          <p className="text-muted-foreground">
            Verify winner submissions and manage payout tracking
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 bg-card border border-border">
            <p className="text-muted-foreground text-sm mb-2">Total Winners</p>
            <p className="text-3xl font-bold text-foreground">
              {loading ? "-" : winners.length}
            </p>
          </Card>
          <Card className="p-6 bg-card border border-border">
            <p className="text-muted-foreground text-sm mb-2">
              Pending Verifications
            </p>
            <p className="text-3xl font-bold text-charity">
              {loading ? "-" : pendingVerifications.length}
            </p>
          </Card>
          <Card className="p-6 bg-card border border-border">
            <p className="text-muted-foreground text-sm mb-2">Verified</p>
            <p className="text-3xl font-bold text-primary">
              {loading ? "-" : approvedVerifications.length}
            </p>
          </Card>
          <Card className="p-6 bg-card border border-border">
            <p className="text-muted-foreground text-sm mb-2">
              Pending Payouts
            </p>
            <p className="text-3xl font-bold text-foreground">
              {loading ? "-" : pendingPayouts.length}
            </p>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="mb-12">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending Verification ({pendingVerifications.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Verified Winners ({approvedVerifications.length})
            </TabsTrigger>
            <TabsTrigger value="payouts">
              Payout Tracking ({pendingPayouts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="p-6 bg-card border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-6">
                Pending Verification
              </h3>

              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : pendingVerifications.length === 0 ? (
                <p className="text-muted-foreground">No pending verifications.</p>
              ) : (
                <div className="space-y-4">
                  {pendingVerifications.map((verification) => (
                    <div
                      key={verification.id}
                      className="p-4 bg-background rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold text-foreground mb-2">
                            Winner ID: {verification.draw_winner_id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Submitted:{" "}
                            {format(new Date(verification.created_at), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      </div>

                      {verification.proof_screenshot_url && (
                        <div className="mb-4 p-3 bg-muted rounded">
                          <p className="text-xs text-muted-foreground mb-2">
                            Proof Screenshot
                          </p>
                          <p className="text-sm text-foreground break-all">
                            {verification.proof_screenshot_url}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleApproveVerification(verification.id)}
                          className="flex-1 bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectVerification(verification.id)}
                          variant="outline"
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card className="p-6 bg-card border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-6">
                Verified Winners
              </h3>

              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : approvedVerifications.length === 0 ? (
                <p className="text-muted-foreground">No verified winners.</p>
              ) : (
                <div className="space-y-3">
                  {approvedVerifications.map((verification) => (
                    <div
                      key={verification.id}
                      className="p-4 bg-background rounded-lg border border-border flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {verification.draw_winner_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Verified:{" "}
                          {verification.verified_at
                            ? format(new Date(verification.verified_at), "MMM dd, yyyy")
                            : "N/A"}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        <Check className="h-3 w-3" />
                        Verified
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card className="p-6 bg-card border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-6">
                Payout Tracking
              </h3>

              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : payouts.length === 0 ? (
                <p className="text-muted-foreground">No payouts.</p>
              ) : (
                <div className="space-y-4">
                  {pendingPayouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="p-4 bg-background rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold text-foreground">
                            GBP {payout.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Winner ID: {payout.draw_winner_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {format(new Date(payout.created_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      </div>

                      <Button
                        onClick={() => handleMarkPaid(payout.id)}
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        Mark as Paid
                      </Button>
                    </div>
                  ))}

                  {paidPayouts.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-border">
                      <h4 className="font-semibold text-foreground mb-4">
                        Completed Payouts ({paidPayouts.length})
                      </h4>
                      <div className="space-y-3">
                        {paidPayouts.map((payout) => (
                          <div
                            key={payout.id}
                            className="p-3 bg-background rounded-lg border border-border flex items-center justify-between"
                          >
                            <div>
                              <p className="font-semibold text-foreground">
                                GBP {payout.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Paid:{" "}
                                {payout.payment_date
                                  ? format(new Date(payout.payment_date), "MMM dd, yyyy")
                                  : "N/A"}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                              <Check className="h-3 w-3" />
                              Paid
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
