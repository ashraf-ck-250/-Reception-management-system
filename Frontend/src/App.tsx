import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import VisitorRecords from "@/pages/VisitorRecords";
import Reports from "@/pages/Reports";
import UserManagement from "@/pages/UserManagement";
import Settings from "@/pages/Settings";
import SubmissionSuccess from "@/pages/SubmissionSuccess";
import PublicHome from "@/pages/PublicHome";
import VisitorForm from "@/pages/VisitorForm";
import MeetingAttendanceForm from "@/pages/MeetingAttendanceForm";
import MeetingRecords from "@/pages/MeetingRecords";
import MeetingLeaderDashboard from "@/pages/MeetingLeaderDashboard";
import RequestStatus from "@/pages/RequestStatus";
import { NavigationProgress } from "@/components/NavigationProgress";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user } = useAuth();
  const lastPath = typeof window !== "undefined" ? localStorage.getItem("last_protected_path") : null;
  const fallbackByRole =
    user?.role === "meeting_leader"
      ? "/meeting-leader"
      : user?.role === "admin"
        ? "/dashboard"
        : user?.role === "receptionist"
          ? "/dashboard"
          : "/dashboard";
  const loginRedirectTarget = user?.role === "receptionist" ? "/dashboard" : (lastPath && lastPath.startsWith("/") ? lastPath : null) || fallbackByRole;
  return (
    <>
      <NavigationProgress />
      <Routes>
      {/* Public form pages */}
      <Route path="/" element={<PublicHome />} />
      <Route path="/visitor" element={<VisitorForm />} />
      <Route path="/meeting" element={<MeetingAttendanceForm />} />
      <Route path="/submission-success" element={<SubmissionSuccess />} />
      <Route path="/request-status/:id" element={<RequestStatus />} />

      {/* Auth & protected */}
      <Route path="/login" element={user ? <Navigate to={loginRedirectTarget} replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/records" element={<ProtectedRoute><VisitorRecords /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/meeting-records" element={<ProtectedRoute adminOnly><MeetingRecords /></ProtectedRoute>} />
      <Route path="/meeting-leader" element={<ProtectedRoute><MeetingLeaderDashboard /></ProtectedRoute>} />
      <Route path="/user-management" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
