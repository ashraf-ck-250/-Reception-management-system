import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import gov from "@/assets/gov.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedPassword = password.trim();

      const loggedInUser = await login(normalizedEmail, normalizedPassword);
      if (loggedInUser) {
        toast.success("Welcome back!");
        navigate(loggedInUser.role === "admin" ? "/dashboard" : "/records");
      } else {
        toast.error("Invalid credentials");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/[0.14] via-background to-primary/[0.08]">
      <Card className="w-full max-w-md shadow-xl border-border bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center">
            <img src={gov} alt="Rwanda government Logo" width={80} height={80} className="rounded-xl" />
          </div>
          <CardTitle className="text-2xl font-bold">ReceptionMS</CardTitle>
          <CardDescription>Sign in to manage reception operations</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="ghost"
            className="group mb-3 px-0 text-muted-foreground hover:bg-transparent hover:text-muted-foreground transition-opacity active:opacity-70"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={16} className="mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to Service & Request Form
          </Button>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@reception.rw" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
