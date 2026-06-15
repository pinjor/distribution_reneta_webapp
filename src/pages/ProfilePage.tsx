import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Warehouse,
  Mail,
  Phone,
  BadgeCheck,
  Building2,
  MapPin,
  LogOut,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  useAuth,
  getUserDisplayName,
  getUserInitials,
  formatRoleLabel,
} from "@/contexts/AuthContext";
import { apiEndpoints } from "@/lib/api";
import { brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";
import { cn } from "@/lib/utils";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tile-from text-brand-from">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className={cn("text-xs font-medium uppercase tracking-wide", brandMutedClasses)}>{label}</p>
        <p className={cn("text-sm font-semibold mt-0.5 break-words", brandLabelClasses)}>{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  useEffect(() => {
    document.title = "My Profile | Renata";
    refreshUser();
  }, [refreshUser]);

  const handleSignOut = async () => {
    try {
      await apiEndpoints.auth.logout();
    } catch {
      // Still clear local session if API fails
    }
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const isAdmin = user.role?.toLowerCase() === "admin";

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="My Profile"
        subtitle="Account details, assigned depot, and session management."
        icon={User}
        variant="sky"
        actions={(
          <Button variant="headerAction" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        )}
      />

      {/* Profile hero */}
      <Card className="card-tile overflow-hidden border-2 border-brand-from/20">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-from to-brand-to text-white text-2xl font-bold shadow-lg shadow-brand-from/30">
              {initials}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className={cn("text-2xl font-bold", brandLabelClasses)}>{displayName}</h2>
              <p className={cn("text-sm mt-1", brandMutedClasses)}>{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <Badge className="bg-gradient-to-r from-brand-from to-brand-to text-white border-0">
                  <Shield className="h-3 w-3 mr-1" />
                  {formatRoleLabel(user.role)}
                </Badge>
                {user.designation && (
                  <Badge variant="outline" className="border-brand-from/30 text-brand-deep">
                    {user.designation}
                  </Badge>
                )}
                {user.department && (
                  <Badge variant="secondary">{user.department}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account details */}
        <Card className="card-tile">
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-lg", brandLabelClasses)}>
              <BadgeCheck className="h-5 w-5 text-brand-from" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow icon={User} label="Employee ID" value={user.employee_id} />
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="Phone" value={user.phone} />
            <InfoRow icon={Building2} label="Department" value={user.department} />
            <InfoRow icon={BadgeCheck} label="Designation" value={user.designation} />
          </CardContent>
        </Card>

        {/* Depot section */}
        <Card className="card-tile border-2 border-brand-from/15">
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-lg", brandLabelClasses)}>
              <Warehouse className="h-5 w-5 text-brand-from" />
              My Depot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAdmin && !user.depot ? (
              <div className="rounded-xl border border-dashed border-brand-from/30 bg-brand-tile-from/50 p-6 text-center">
                <Warehouse className="h-10 w-10 mx-auto text-brand-from mb-3" />
                <p className={cn("font-semibold", brandLabelClasses)}>Administrator Access</p>
                <p className={cn("text-sm mt-1", brandMutedClasses)}>
                  You can view and manage data across all depots.
                </p>
              </div>
            ) : user.depot ? (
              <div className="space-y-1">
                <div className="mb-4 rounded-xl bg-gradient-to-r from-brand-from/10 to-brand-to/10 border border-brand-from/20 p-4">
                  <p className={cn("text-lg font-bold", brandLabelClasses)}>{user.depot.name}</p>
                  <p className={cn("text-sm font-mono mt-0.5", brandMutedClasses)}>
                    Code: {user.depot.code}
                  </p>
                </div>
                <InfoRow icon={MapPin} label="Address" value={user.depot.address} />
                <InfoRow
                  icon={MapPin}
                  label="Location"
                  value={[user.depot.city, user.depot.state].filter(Boolean).join(", ") || undefined}
                />
                <InfoRow icon={Phone} label="Depot Phone" value={user.depot.phone} />
                <InfoRow icon={Mail} label="Depot Email" value={user.depot.email} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                <Warehouse className="h-10 w-10 mx-auto opacity-40 mb-3" />
                <p className="text-sm">No depot assigned to your account.</p>
                <p className="text-xs mt-1">Contact your administrator to assign a depot.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <div>
          <p className="font-semibold text-foreground">Sign out of Renata DMS</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            End your current session on this device.
          </p>
        </div>
        <Button variant="destructive" onClick={handleSignOut} className="sm:shrink-0">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
