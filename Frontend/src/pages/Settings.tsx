import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { Save, Bell, Shield, Palette } from "lucide-react";
import { api } from "@/lib/api";
import {
  getStaffDesktopNotificationsEnabled,
  setStaffDesktopNotificationsEnabled,
  requestNotificationPermission,
  isDesktopNotificationSupported,
  STAFF_DESKTOP_ENABLED_EVENT
} from "@/lib/desktopNotifications";

export default function Settings() {
  const { user, setUserProfile } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [notifications, setNotifications] = useState({
    browser: getStaffDesktopNotificationsEnabled(),
    newVisitor: true,
    newRequest: true
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("User session is missing. Please sign in again.");
      return;
    }
    setSaveLoading(true);
    try {
      const response = await api.patch("/users/me", { name: profile.name, email: profile.email });
      const updatedUser = {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
        avatarUrl: response.data.avatarUrl
      };
      setUserProfile(updatedUser);
      setAvatarPreview(updatedUser.avatarUrl || avatarPreview);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.error("Please choose an image first");
      return;
    }
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const response = await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const updatedUser = {
        id: user?.id,
        name: user?.name || profile.name,
        email: user?.email || profile.email,
        role: user?.role || "receptionist",
        avatarUrl: response.data.avatarUrl
      };
      setUserProfile(updatedUser);
      setAvatarPreview(response.data.avatarUrl);
      setAvatarFile(null);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload profile photo");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield size={18} className="text-primary" />Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <img src={avatarPreview} alt={profile.name} className="h-16 w-16 rounded-full object-cover border border-border" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
                {(profile.name || "U")[0]}
              </div>
            )}
          </div>
          <div>
            <Label>Full Name</Label>
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} type="email" />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={user?.role || ""} disabled className="capitalize bg-muted" />
          </div>
          <Button onClick={() => void handleSave()} className="gap-2" loading={saveLoading}>
            <Save size={16} />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell size={18} className="text-primary" />Notifications</CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Desktop notifications</p>
              <p className="text-xs text-muted-foreground">Pop-up alerts when you receive reception alerts (browser must allow)</p>
            </div>
            <Switch
              checked={notifications.browser}
              onCheckedChange={async (v) => {
                if (v) {
                  if (!isDesktopNotificationSupported()) {
                    toast.error("This browser does not support desktop notifications.");
                    return;
                  }
                  const p = await requestNotificationPermission();
                  if (p !== "granted") {
                    toast.error("Notifications were blocked. Allow them in your browser settings to use this feature.");
                    return;
                  }
                  setStaffDesktopNotificationsEnabled(true);
                  setNotifications((n) => ({ ...n, browser: true }));
                  window.dispatchEvent(new Event(STAFF_DESKTOP_ENABLED_EVENT));
                  toast.success("You will get desktop alerts for new notifications.");
                } else {
                  setStaffDesktopNotificationsEnabled(false);
                  setNotifications((n) => ({ ...n, browser: false }));
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">New Visitor Alerts</p>
              <p className="text-xs text-muted-foreground">Get notified when a new visitor checks in</p>
            </div>
            <Switch checked={notifications.newVisitor} onCheckedChange={(v) => setNotifications({ ...notifications, newVisitor: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">New Request Alerts</p>
              <p className="text-xs text-muted-foreground">Get notified for new visitor requests</p>
            </div>
            <Switch checked={notifications.newRequest} onCheckedChange={(v) => setNotifications({ ...notifications, newRequest: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Palette size={18} className="text-primary" />Security</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input type="password" placeholder="Enter current password" />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" placeholder="Enter new password" />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" placeholder="Confirm new password" />
          </div>
          <Button onClick={() => toast.success("Password updated")} className="gap-2"><Save size={16} />Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
