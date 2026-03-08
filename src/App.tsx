import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import AuthPage from "./pages/AuthPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import EventsPage from "./pages/EventsPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import AdminDashboardPage from "./pages/admin/DashboardPage";
import AdminEntitiesPage from "./pages/admin/EntitiesPage";
import AdminEntityUsersPage from "./pages/admin/EntityUsersPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminLoginPage />} />
            {/* Legacy route redirect */}
            <Route path="/admin-login" element={<Navigate to="/admin" replace />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <EventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <ProtectedRoute>
                  <EventDetailsPage />
                </ProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <SuperAdminRoute>
                  <AdminDashboardPage />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/admin/entities"
              element={
                <SuperAdminRoute>
                  <AdminEntitiesPage />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/admin/entities/:entityId/users"
              element={
                <SuperAdminRoute>
                  <AdminEntityUsersPage />
                </SuperAdminRoute>
              }
            />
            {/* Legacy route redirects */}
            <Route path="/super-admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/super-admin/*" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
