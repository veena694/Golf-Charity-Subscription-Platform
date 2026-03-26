import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost } from "@/lib/api";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "subscriber" | "public";
  subscription_status: "active" | "inactive" | "cancelled" | "expired";
  subscription_plan: "monthly" | "yearly" | null;
  subscription_end_date: string | null;
  selected_charity_id: string | null;
  charity_contribution_percentage: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isSubscriber: boolean;
  isAdmin: boolean;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUserProfile(
  profile: Partial<UserProfile> | null | undefined,
  authUser: User,
): UserProfile {
  const fallbackName =
    String(authUser.user_metadata?.full_name || "").trim() ||
    authUser.email?.split("@")[0] ||
    "Member";
  const now = new Date().toISOString();

  return {
    id: profile?.id || authUser.id,
    email: profile?.email || authUser.email || "",
    full_name: profile?.full_name || fallbackName,
    role: (profile?.role || "subscriber") as UserProfile["role"],
    subscription_status:
      (profile?.subscription_status || "inactive") as UserProfile["subscription_status"],
    subscription_plan:
      (profile?.subscription_plan ?? null) as UserProfile["subscription_plan"],
    subscription_end_date: profile?.subscription_end_date ?? null,
    selected_charity_id: profile?.selected_charity_id ?? null,
    charity_contribution_percentage:
      profile?.charity_contribution_percentage ?? 10,
    created_at: profile?.created_at || now,
    updated_at: profile?.updated_at || now,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const buildFallbackProfile = (authUser: User): UserProfile => {
    return normalizeUserProfile(null, authUser);
  };

  const ensureUserProfile = async (authUser: User) => {
    const fallbackProfile = buildFallbackProfile(authUser);

    try {
      const response = await apiPost<{ profile: UserProfile }>(
        "/api/auth/sync-profile",
        {
          id: authUser.id,
          email: authUser.email || "",
          fullName: fallbackProfile.full_name,
        },
      );
      return normalizeUserProfile(response.profile, authUser);
    } catch (error) {
      console.error("Error syncing user profile through backend:", error);
      return fallbackProfile;
    }
  };

  const getUserWithTimeout = async () => {
    const timeoutMs = 8000;

    return Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => {
          reject(new Error("Auth request timed out"));
        }, timeoutMs);
      }),
    ]);
  };

  // Load user on component mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await getUserWithTimeout();
        setUser(user || null);

        if (user) {
          await loadUserProfile(user.id, user);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setUser(session?.user || null);
        if (session?.user) {
          await loadUserProfile(session.user.id, session.user);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error(`Auth state change error (${event}):`, error);
        if (session?.user) {
          setUserProfile(buildFallbackProfile(session.user));
        } else {
          setUserProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string, authUserOverride?: User) => {
    try {
      const authUser = authUserOverride || user;
      if (authUser && authUser.id === userId) {
        setUserProfile((current) =>
          current?.id === userId ? current : buildFallbackProfile(authUser),
        );
      }

      const response = await apiGet<{ profile: UserProfile | null }>(
        `/api/auth/profile/${userId}`,
      );
      const data = response.profile;

      if (data) {
        const normalizedProfile = authUser ? normalizeUserProfile(data, authUser) : data;
        setUserProfile(normalizedProfile);
        return normalizedProfile;
      }

      if (authUser && authUser.id === userId) {
        const createdProfile = await ensureUserProfile(authUser);
        setUserProfile(createdProfile);
        return createdProfile;
      }

      setUserProfile(null);
      return null;
    } catch (error) {
      console.error("Error loading user profile:", error);
      if (authUserOverride) {
        const fallbackProfile = buildFallbackProfile(authUserOverride);
        setUserProfile(fallbackProfile);
        return fallbackProfile;
      } else {
        setUserProfile(null);
        return null;
      }
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    try {
      // Trim inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp(
        {
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
            },
          },
        }
      );

      if (authError) {
        console.error("Auth error details:", authError);
        throw authError;
      }

      if (!authData.user) throw new Error("User creation failed");

      setUser(authData.user);
      await ensureUserProfile(authData.user);
      await loadUserProfile(authData.user.id, authData.user);
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) throw error;

      setUser(data.user);
      const profile = await loadUserProfile(data.user.id, data.user);
      return profile;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;

      setUser(null);
      setUserProfile(null);
      setLoading(false);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadUserProfile(user.id, user);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isSubscriber: userProfile?.subscription_status === "active" || false,
    isAdmin: userProfile?.role === "admin" || false,
    signup,
    login,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
