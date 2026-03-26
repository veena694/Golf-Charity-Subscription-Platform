import { Heart, LayoutDashboard, LogOut, Settings, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type AccountMenuProps = {
  onProfile?: () => void;
  labelClassName?: string;
};

export function AccountMenu({ onProfile, labelClassName }: AccountMenuProps) {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  const { toast } = useToast();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      toast({
        title: "Error",
        description: "Failed to logout.",
        variant: "destructive",
      });
    }
  };

  const dashboardRoute = userProfile?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="flex items-center gap-3">
      {labelClassName ? (
        <span className={labelClassName}>
          {userProfile?.full_name || user.email || "My Account"}
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {userProfile?.full_name || user.email || "My Account"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              if (userProfile?.role !== "admin") {
                onProfile?.();
              }
              navigate(dashboardRoute);
            }}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {userProfile?.role === "admin" ? "Admin Dashboard" : "Dashboard"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate("/charities")}>
            <Heart className="mr-2 h-4 w-4" />
            Charities
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate("/subscribe")}>
            <Settings className="mr-2 h-4 w-4" />
            Subscription
          </DropdownMenuItem>
          {userProfile?.role === "admin" && (
            <DropdownMenuItem onSelect={() => navigate("/admin")}>
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void handleLogout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
