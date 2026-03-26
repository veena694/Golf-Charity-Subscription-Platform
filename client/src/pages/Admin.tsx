import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { BarChart3, Gift, Plus, Users } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/api";

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  subscription_status: string;
  subscription_plan?: string | null;
  created_at: string;
}

interface SubscriptionRecord {
  id: string;
  user_id: string;
  status: string;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface CharityRecord {
  id: string;
  name: string;
  description: string | null;
  featured: boolean;
  image_url?: string | null;
  website_url: string | null;
  created_at?: string;
}

interface ReportsSnapshot {
  totalUsers: number;
  activeSubscriptions: number;
  inactiveUsers: number;
  totalCharities: number;
  featuredCharities: number;
  totalPrizePool: number;
  charityContributionTotal: number;
  drawStatistics: {
    totalDraws: number;
    publishedDraws: number;
    pendingDraws: number;
  };
  winnerStatistics: {
    pendingVerifications: number;
    approvedVerifications: number;
    pendingPayouts: number;
    paidPayouts: number;
  };
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [charities, setCharities] = useState<CharityRecord[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalCharities: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [showCharityForm, setShowCharityForm] = useState(false);
  const [creatingCharity, setCreatingCharity] = useState(false);
  const [reports, setReports] = useState<ReportsSnapshot | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [editingCharityId, setEditingCharityId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingSubscriptionId, setSavingSubscriptionId] = useState<string | null>(null);
  const [savingCharityId, setSavingCharityId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    fullName: "",
    role: "subscriber",
    subscriptionStatus: "inactive",
    subscriptionPlan: "",
  });
  const [subscriptionStatusDrafts, setSubscriptionStatusDrafts] = useState<Record<string, string>>({});
  const [charityForm, setCharityForm] = useState({
    name: "",
    description: "",
    websiteUrl: "",
    imageUrl: "",
    featured: false,
  });

  useEffect(() => {
    if (!loading && (!user || userProfile?.role !== "admin")) {
      navigate("/");
    }
  }, [user, userProfile, loading, navigate]);

  useEffect(() => {
    if (!user || userProfile?.role !== "admin") return;
    void loadAdminData();
  }, [user, userProfile]);

  const loadAdminData = async () => {
    try {
      const [overview, usersResponse, subscriptionsResponse, charitiesResponse] =
        await Promise.all([
          apiGet<{
            totalUsers: number;
            activeSubscriptions: number;
            totalCharities: number;
          }>("/api/admin/overview"),
          apiGet<{ users: AdminUser[] }>("/api/admin/users"),
          apiGet<{ subscriptions: SubscriptionRecord[] }>("/api/admin/subscriptions"),
          apiGet<{ charities: CharityRecord[] }>("/api/admin/charities"),
        ]);
      const reportsResponse = await apiGet<ReportsSnapshot>("/api/admin/reports");

      setStats(overview);
      setUsers(usersResponse.users || []);
      setSubscriptions(subscriptionsResponse.subscriptions || []);
      setCharities(charitiesResponse.charities || []);
      setReports(reportsResponse);
      setSubscriptionStatusDrafts(
        Object.fromEntries(
          (subscriptionsResponse.subscriptions || []).map((subscription) => [
            subscription.id,
            subscription.status,
          ]),
        ),
      );
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateCharity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCharity(true);

    try {
      const response = await apiPost<{ charity: CharityRecord }>("/api/admin/charities", {
        name: charityForm.name,
        description: charityForm.description,
        websiteUrl: charityForm.websiteUrl,
        imageUrl: charityForm.imageUrl,
        featured: charityForm.featured,
      });

      setCharities((current) => [response.charity, ...current]);
      setStats((current) => ({
        ...current,
        totalCharities: current.totalCharities + 1,
      }));
      setShowCharityForm(false);
      setCharityForm({
        name: "",
        description: "",
        websiteUrl: "",
        imageUrl: "",
        featured: false,
      });
      toast({
        title: "Success",
        description: "Charity created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create charity.",
        variant: "destructive",
      });
    } finally {
      setCreatingCharity(false);
    }
  };

  const startEditingUser = (adminUser: AdminUser) => {
    setEditingUserId(adminUser.id);
    setUserForm({
      fullName: adminUser.full_name,
      role: (adminUser as any).role || "subscriber",
      subscriptionStatus: adminUser.subscription_status || "inactive",
      subscriptionPlan: (adminUser as any).subscription_plan || "",
    });
  };

  const handleSaveUser = async (userId: string) => {
    setSavingUserId(userId);

    try {
      const response = await apiPost<{ user: AdminUser }>(`/api/admin/users/${userId}`, {
        fullName: userForm.fullName,
        role: userForm.role,
        subscriptionStatus: userForm.subscriptionStatus,
        subscriptionPlan: userForm.subscriptionPlan || null,
      });

      setUsers((current) =>
        current.map((item) => (item.id === userId ? { ...item, ...response.user } : item)),
      );
      setEditingUserId(null);
      toast({
        title: "Success",
        description: "User updated successfully.",
      });
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const handleSaveSubscription = async (subscriptionId: string) => {
    const status = subscriptionStatusDrafts[subscriptionId];
    if (!status) return;

    setSavingSubscriptionId(subscriptionId);
    try {
      const response = await apiPost<{ subscription: SubscriptionRecord }>(
        `/api/admin/subscriptions/${subscriptionId}/status`,
        { status },
      );

      setSubscriptions((current) =>
        current.map((item) =>
          item.id === subscriptionId ? { ...item, ...response.subscription } : item,
        ),
      );
      setEditingSubscriptionId(null);
      toast({
        title: "Success",
        description: "Subscription updated successfully.",
      });
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription.",
        variant: "destructive",
      });
    } finally {
      setSavingSubscriptionId(null);
    }
  };

  const startEditingCharity = (charity: CharityRecord) => {
    setEditingCharityId(charity.id);
    setCharityForm({
      name: charity.name,
      description: charity.description || "",
      websiteUrl: charity.website_url || "",
      imageUrl: charity.image_url || "",
      featured: charity.featured,
    });
  };

  const handleUpdateCharity = async (charityId: string) => {
    setSavingCharityId(charityId);

    try {
      const response = await apiPost<{ charity: CharityRecord }>(`/api/admin/charities/${charityId}`, {
        name: charityForm.name,
        description: charityForm.description,
        websiteUrl: charityForm.websiteUrl,
        imageUrl: charityForm.imageUrl,
        featured: charityForm.featured,
      });

      setCharities((current) =>
        current.map((item) => (item.id === charityId ? response.charity : item)),
      );
      setEditingCharityId(null);
      toast({
        title: "Success",
        description: "Charity updated successfully.",
      });
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update charity.",
        variant: "destructive",
      });
    } finally {
      setSavingCharityId(null);
    }
  };

  const handleDeleteCharity = async (charityId: string) => {
    setSavingCharityId(charityId);

    try {
      await apiPost(`/api/admin/charities/${charityId}/delete`);
      setCharities((current) => current.filter((item) => item.id !== charityId));
      toast({
        title: "Success",
        description: "Charity deleted successfully.",
      });
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete charity.",
        variant: "destructive",
      });
    } finally {
      setSavingCharityId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || userProfile?.role !== "admin") {
    return null;
  }

  const inactiveUsers = users.filter(
    (adminUser) => adminUser.subscription_status !== "active",
  ).length;
  const featuredCharities = charities.filter((charity) => charity.featured).length;
  const monthlySubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active",
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary">
            GolfFlow Admin
          </Link>
          <AccountMenu labelClassName="text-sm text-muted-foreground" />
        </div>
      </nav>

      <div className="p-6">
        <div className="container max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage users, subscriptions, draws, charities, and winners.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Total Users</h3>
                <Users className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {dataLoading ? "-" : stats.totalUsers}
              </p>
            </Card>

            <Card className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">
                  Active Subscriptions
                </h3>
                <Gift className="h-5 w-5 text-charity" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {dataLoading ? "-" : stats.activeSubscriptions}
              </p>
            </Card>

            <Card className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Charities</h3>
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {dataLoading ? "-" : stats.totalCharities}
              </p>
            </Card>
          </div>

          <Tabs defaultValue="users" className="mb-12">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="draws">Draws</TabsTrigger>
              <TabsTrigger value="charities">Charities</TabsTrigger>
              <TabsTrigger value="winners">Winners</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  User Management
                </h3>
                {dataLoading ? (
                  <p className="text-muted-foreground">Loading users...</p>
                ) : users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 font-semibold text-foreground">Name</th>
                          <th className="text-left p-3 font-semibold text-foreground">Email</th>
                          <th className="text-left p-3 font-semibold text-foreground">Status</th>
                          <th className="text-left p-3 font-semibold text-foreground">Actions</th>
                          <th className="text-left p-3 font-semibold text-foreground">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((adminUser) => (
                          <tr
                            key={adminUser.id}
                            className="border-b border-border hover:bg-muted/50"
                          >
                            <td className="p-3 text-foreground">
                              {editingUserId === adminUser.id ? (
                                <Input
                                  value={userForm.fullName}
                                  onChange={(e) =>
                                    setUserForm((current) => ({
                                      ...current,
                                      fullName: e.target.value,
                                    }))
                                  }
                                />
                              ) : (
                                adminUser.full_name
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">{adminUser.email}</td>
                            <td className="p-3">
                              {editingUserId === adminUser.id ? (
                                <div className="grid gap-2">
                                  <select
                                    className="rounded border border-border bg-background px-2 py-1"
                                    value={userForm.subscriptionStatus}
                                    onChange={(e) =>
                                      setUserForm((current) => ({
                                        ...current,
                                        subscriptionStatus: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="active">active</option>
                                    <option value="inactive">inactive</option>
                                    <option value="cancelled">cancelled</option>
                                    <option value="expired">expired</option>
                                  </select>
                                  <select
                                    className="rounded border border-border bg-background px-2 py-1"
                                    value={userForm.role}
                                    onChange={(e) =>
                                      setUserForm((current) => ({
                                        ...current,
                                        role: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="subscriber">subscriber</option>
                                    <option value="admin">admin</option>
                                    <option value="public">public</option>
                                  </select>
                                </div>
                              ) : (
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                    adminUser.subscription_status === "active"
                                      ? "bg-primary/20 text-primary"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {adminUser.subscription_status}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                {editingUserId === adminUser.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => void handleSaveUser(adminUser.id)}
                                      disabled={savingUserId === adminUser.id}
                                    >
                                      {savingUserId === adminUser.id ? "Saving..." : "Save"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingUserId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditingUser(adminUser)}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {format(new Date(adminUser.created_at), "MMM dd, yyyy")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No users found.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="subscriptions">
              <Card className="p-6 bg-card border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    Subscription Management
                  </h3>
                  <Button onClick={() => void loadAdminData()} className="bg-primary hover:bg-primary/90">
                    Refresh
                  </Button>
                </div>
                {subscriptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 font-semibold text-foreground">User ID</th>
                          <th className="text-left p-3 font-semibold text-foreground">Status</th>
                          <th className="text-left p-3 font-semibold text-foreground">Stripe ID</th>
                          <th className="text-left p-3 font-semibold text-foreground">Actions</th>
                          <th className="text-left p-3 font-semibold text-foreground">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.map((subscription) => (
                          <tr key={subscription.id} className="border-b border-border">
                            <td className="p-3 text-foreground">{subscription.user_id}</td>
                            <td className="p-3 text-muted-foreground">
                              {editingSubscriptionId === subscription.id ? (
                                <select
                                  className="rounded border border-border bg-background px-2 py-1"
                                  value={subscriptionStatusDrafts[subscription.id] || subscription.status}
                                  onChange={(e) =>
                                    setSubscriptionStatusDrafts((current) => ({
                                      ...current,
                                      [subscription.id]: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="active">active</option>
                                  <option value="inactive">inactive</option>
                                  <option value="cancelled">cancelled</option>
                                  <option value="expired">expired</option>
                                </select>
                              ) : (
                                subscription.status
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {subscription.stripe_subscription_id || "N/A"}
                            </td>
                            <td className="p-3">
                              {editingSubscriptionId === subscription.id ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => void handleSaveSubscription(subscription.id)}
                                    disabled={savingSubscriptionId === subscription.id}
                                  >
                                    {savingSubscriptionId === subscription.id ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingSubscriptionId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingSubscriptionId(subscription.id)}
                                >
                                  Edit
                                </Button>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {format(new Date(subscription.created_at), "MMM dd, yyyy")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No subscriptions found.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="draws">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Draw Management
                </h3>
                <p className="text-muted-foreground mb-6">
                  Create and publish draw rounds from the dedicated draw manager.
                </p>
                <div className="space-y-3">
                  <Button className="w-full bg-primary hover:bg-primary/90" asChild>
                    <Link to="/admin/draws">Manage Draws</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/admin/draws">Open Draw Creator</Link>
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="charities">
              <Card className="p-6 bg-card border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    Charity Management
                  </h3>
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => setShowCharityForm((value) => !value)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {showCharityForm ? "Close Form" : "Add New Charity"}
                  </Button>
                </div>

                {showCharityForm && (
                  <form onSubmit={handleCreateCharity} className="space-y-4 mb-8">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="charityName">Name</Label>
                        <Input
                          id="charityName"
                          value={charityForm.name}
                          onChange={(e) =>
                            setCharityForm({ ...charityForm, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="charityWebsite">Website URL</Label>
                        <Input
                          id="charityWebsite"
                          value={charityForm.websiteUrl}
                          onChange={(e) =>
                            setCharityForm({ ...charityForm, websiteUrl: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="charityImage">Image URL</Label>
                      <Input
                        id="charityImage"
                        value={charityForm.imageUrl}
                        onChange={(e) =>
                          setCharityForm({ ...charityForm, imageUrl: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="charityDescription">Description</Label>
                      <Input
                        id="charityDescription"
                        value={charityForm.description}
                        onChange={(e) =>
                          setCharityForm({ ...charityForm, description: e.target.value })
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={charityForm.featured}
                        onChange={(e) =>
                          setCharityForm({ ...charityForm, featured: e.target.checked })
                        }
                      />
                      Featured charity
                    </label>
                    <Button
                      type="submit"
                      disabled={creatingCharity}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {creatingCharity ? "Creating..." : "Create Charity"}
                    </Button>
                  </form>
                )}

                {charities.length > 0 ? (
                  <div className="space-y-3">
                    {charities.map((charity) => (
                      <div
                        key={charity.id}
                        className="p-4 bg-background rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            {editingCharityId === charity.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={charityForm.name}
                                  onChange={(e) =>
                                    setCharityForm((current) => ({
                                      ...current,
                                      name: e.target.value,
                                    }))
                                  }
                                />
                                <Input
                                  value={charityForm.description}
                                  onChange={(e) =>
                                    setCharityForm((current) => ({
                                      ...current,
                                      description: e.target.value,
                                    }))
                                  }
                                />
                                <Input
                                  value={charityForm.websiteUrl}
                                  onChange={(e) =>
                                    setCharityForm((current) => ({
                                      ...current,
                                      websiteUrl: e.target.value,
                                    }))
                                  }
                                />
                                <Input
                                  value={charityForm.imageUrl}
                                  onChange={(e) =>
                                    setCharityForm((current) => ({
                                      ...current,
                                      imageUrl: e.target.value,
                                    }))
                                  }
                                />
                                <label className="flex items-center gap-2 text-sm text-foreground">
                                  <input
                                    type="checkbox"
                                    checked={charityForm.featured}
                                    onChange={(e) =>
                                      setCharityForm((current) => ({
                                        ...current,
                                        featured: e.target.checked,
                                      }))
                                    }
                                  />
                                  Featured charity
                                </label>
                              </div>
                            ) : (
                              <>
                                <p className="font-semibold text-foreground">{charity.name}</p>
                                {charity.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {charity.description}
                                  </p>
                                )}
                                {charity.website_url && (
                                  <a
                                    href={charity.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary"
                                  >
                                    {charity.website_url}
                                  </a>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              {charity.featured ? "Featured" : "Standard"}
                            </span>
                            {editingCharityId === charity.id ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void handleUpdateCharity(charity.id)}
                                  disabled={savingCharityId === charity.id}
                                >
                                  {savingCharityId === charity.id ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCharityId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditingCharity(charity)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleDeleteCharity(charity.id)}
                                  disabled={savingCharityId === charity.id}
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No charities found.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="winners">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Winner Verification & Payouts
                </h3>
                <p className="text-muted-foreground mb-6">
                  Review winner submissions, verify proofs, and track payout
                  status in the dedicated winners screen.
                </p>
                <div className="space-y-3">
                  <Button className="w-full bg-primary hover:bg-primary/90" asChild>
                    <Link to="/admin/winners">Manage Winners & Payouts</Link>
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card className="p-6 bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Reports & Analytics
                </h3>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground mb-2">Active vs Inactive Users</p>
                    <p className="text-2xl font-bold text-foreground">
                      {reports?.activeSubscriptions ?? stats.activeSubscriptions} / {reports?.inactiveUsers ?? inactiveUsers}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      active subscribers / inactive users
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground mb-2">Featured Charities</p>
                    <p className="text-2xl font-bold text-foreground">{reports?.featuredCharities ?? featuredCharities}</p>
                    <p className="text-xs text-muted-foreground">
                      out of {stats.totalCharities} total charities
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground mb-2">Tracked Subscriptions</p>
                    <p className="text-2xl font-bold text-foreground">{monthlySubscriptions}</p>
                    <p className="text-xs text-muted-foreground">
                      active subscription records in the system
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border bg-background p-4">
                      <p className="text-sm text-muted-foreground mb-2">Total Prize Pool</p>
                      <p className="text-2xl font-bold text-foreground">
                        GBP {(reports?.totalPrizePool || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-4">
                      <p className="text-sm text-muted-foreground mb-2">Charity Contribution Total</p>
                      <p className="text-2xl font-bold text-foreground">
                        GBP {(reports?.charityContributionTotal || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border bg-background p-4">
                      <p className="font-semibold text-foreground mb-2">Draw Statistics</p>
                      <p className="text-sm text-muted-foreground">
                        Total draws: {reports?.drawStatistics.totalDraws || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Published: {reports?.drawStatistics.publishedDraws || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pending: {reports?.drawStatistics.pendingDraws || 0}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-4">
                      <p className="font-semibold text-foreground mb-2">Winner Statistics</p>
                      <p className="text-sm text-muted-foreground">
                        Pending verifications: {reports?.winnerStatistics.pendingVerifications || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Approved verifications: {reports?.winnerStatistics.approvedVerifications || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pending payouts: {reports?.winnerStatistics.pendingPayouts || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Paid payouts: {reports?.winnerStatistics.paidPayouts || 0}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="font-semibold text-foreground mb-2">Platform Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Use this admin area to manage users and subscriptions, configure and run draws,
                      manage charity listings, verify winners and payouts, and monitor platform growth
                      from one place.
                    </p>
                  </div>
                  <Button onClick={() => void loadAdminData()} className="bg-primary hover:bg-primary/90">
                    Refresh Reports
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
