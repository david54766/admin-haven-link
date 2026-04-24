import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BrandingInitializer } from "@/components/BrandingInitializer";

// Public pages
import Landing from "./pages/Landing";
import Apply from "./pages/Apply";
import StaffRegister from "./pages/StaffRegister";
import Login from "./pages/Login";
import SelectOrganization from "./pages/SelectOrganization";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pending from "./pages/Pending";
import Rejected from "./pages/Rejected";
import Disabled from "./pages/Disabled";
import NotFound from "./pages/NotFound";

// Protected pages
import Dashboard from "./pages/Dashboard";
import Training from "./pages/Training";
import TrackDetail from "./pages/TrackDetail";
import TrackCertificate from "./pages/TrackCertificate";
import VideoPlayerPage from "./pages/VideoPlayer";
import QuizPlayerPage from "./pages/QuizPlayer";
import HomeworkSubmissionPage from "./pages/HomeworkSubmission";
import Documents from "./pages/Documents";
import CertificatesHours from "./pages/CertificatesHours";
import Reflections from "./pages/Reflections";
import Checklists from "./pages/Checklists";
import StaffCalendar from "./pages/StaffCalendar";
import Profile from "./pages/Profile";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminContent from "./pages/admin/AdminContent";
import AdminCertificatesHours from "./pages/admin/AdminCertificatesHours";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminChecklists from "./pages/admin/AdminChecklists";
import AdminExpenses from "./pages/admin/AdminExpenses";
import AdminCalendar from "./pages/admin/AdminCalendar";
import PlatformDashboard from "./pages/platform/PlatformDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrandingInitializer>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <TenantProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            {/* Bare apply/register/login route through a tenant selector to avoid landing in the platform tenant */}
            <Route path="/apply" element={<SelectOrganization destination="apply" />} />
            <Route path="/register" element={<SelectOrganization destination="register" />} />
            <Route path="/login" element={<Login />} />
            {/* Tenant-scoped public routes */}
            <Route path="/t/:slug/apply" element={<Apply />} />
            <Route path="/t/:slug/register" element={<StaffRegister />} />
            <Route path="/t/:slug/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/rejected" element={<Rejected />} />
            <Route path="/disabled" element={<Disabled />} />

            {/* Protected staff routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
            <Route path="/training/:trackId" element={<ProtectedRoute><TrackDetail /></ProtectedRoute>} />
            <Route path="/training/:trackId/video/:videoId" element={<ProtectedRoute><VideoPlayerPage /></ProtectedRoute>} />
            <Route path="/training/:trackId/quiz/:quizId" element={<ProtectedRoute><QuizPlayerPage /></ProtectedRoute>} />
            <Route path="/training/:trackId/homework/:homeworkId" element={<ProtectedRoute><HomeworkSubmissionPage /></ProtectedRoute>} />
            <Route path="/certificate/:certificateId" element={<ProtectedRoute><TrackCertificate /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/certificates" element={<ProtectedRoute><CertificatesHours /></ProtectedRoute>} />
            <Route path="/reflections" element={<ProtectedRoute><Reflections /></ProtectedRoute>} />
            <Route path="/checklists" element={<ProtectedRoute><Checklists /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><StaffCalendar /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/content" element={<ProtectedRoute requireAdmin><AdminContent /></ProtectedRoute>} />
            <Route path="/admin/certificates" element={<ProtectedRoute requireAdmin><AdminCertificatesHours /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requireAdmin><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/documents" element={<ProtectedRoute requireAdmin><AdminDocuments /></ProtectedRoute>} />
            <Route path="/admin/checklists" element={<ProtectedRoute requireAdmin><AdminChecklists /></ProtectedRoute>} />
            <Route path="/admin/expenses" element={<ProtectedRoute requireAdmin><AdminExpenses /></ProtectedRoute>} />
            <Route path="/admin/calendar" element={<ProtectedRoute requireAdmin><AdminCalendar /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />

            {/* Platform admin routes */}
            <Route path="/platform" element={<ProtectedRoute requirePlatformAdmin requireApproval={false}><PlatformDashboard /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        </TenantProvider>
      </BrowserRouter>
      </BrandingInitializer>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
