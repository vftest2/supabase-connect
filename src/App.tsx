import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/components/branding/BrandingProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import AuthPage from "./pages/AuthPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import EventsPage from "./pages/EventsPage";
import AgendaPage from "./pages/AgendaPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import RentalsPage from "./pages/RentalsPage";
import RentalDetailsPage from "./pages/RentalDetailsPage";
import ContractsPage from "./pages/ContractsPage";
import SettingsPage from "./pages/SettingsPage";
import LogisticsPage from "./pages/LogisticsPage";
import DamagesPage from "./pages/DamagesPage";
import TeamPage from "./pages/TeamPage";
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
          <BrandingProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin-login" element={<Navigate to="/admin" replace />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
            <Route path="/events/:id" element={<ProtectedRoute><EventDetailsPage /></ProtectedRoute>} />
            <Route path="/rentals" element={<ProtectedRoute><RentalsPage /></ProtectedRoute>} />
            <Route path="/rentals/:id" element={<ProtectedRoute><RentalDetailsPage /></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/logistics" element={<ProtectedRoute><LogisticsPage /></ProtectedRoute>} />
            <Route path="/damages" element={<ProtectedRoute><DamagesPage /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<SuperAdminRoute><AdminDashboardPage /></SuperAdminRoute>} />
            <Route path="/admin/entities" element={<SuperAdminRoute><AdminEntitiesPage /></SuperAdminRoute>} />
            <Route path="/admin/entities/:entityId/users" element={<SuperAdminRoute><AdminEntityUsersPage /></SuperAdminRoute>} />
            {/* Legacy */}
            <Route path="/super-admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/super-admin/*" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrandingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
