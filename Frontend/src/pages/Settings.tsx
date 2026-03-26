import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { Save, Bell, Shield, Palette } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [notifications, setNotifications] = useState({ email: true, browser: false, newVisitor: true, newRequest: true });

  const handleSave = () => {
    toast.success("Settings saved successfully");
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
          <Button onClick={handleSave} className="gap-2"><Save size={16} />Save Changes</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell size={18} className="text-primary" />Notifications</CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch checked={notifications.email} onCheckedChange={(v) => setNotifications({ ...notifications, email: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Browser Notifications</p>
              <p className="text-xs text-muted-foreground">Desktop push notifications</p>
            </div>
            <Switch checked={notifications.browser} onCheckedChange={(v) => setNotifications({ ...notifications, browser: v })} />
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
              <p className="text-sm font-medium text-foreground">Service Request Alerts</p>
              <p className="text-xs text-muted-foreground">Get notified for new service requests</p>
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
