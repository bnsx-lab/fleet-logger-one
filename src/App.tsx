import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRegistros from "./pages/admin/AdminRegistros";
import AdminRegistroDetalhe from "./pages/admin/AdminRegistroDetalhe";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";

import MotoristaLayout from "./pages/motorista/MotoristaLayout";
import MotoristaHome from "./pages/motorista/MotoristaHome";
import MotoristaHistorico from "./pages/motorista/MotoristaHistorico";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />

            {/* Motorista */}
            <Route
              path="/app"
              element={<ProtectedRoute><MotoristaLayout /></ProtectedRoute>}
            >
              <Route index element={<MotoristaHome />} />
              <Route path="historico" element={<MotoristaHistorico />} />
            </Route>

            {/* Admin */}
            <Route
              path="/admin"
              element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}
            >
              <Route index element={<AdminDashboard />} />
              <Route path="registros" element={<AdminRegistros />} />
              <Route path="registros/:id" element={<AdminRegistroDetalhe />} />
              <Route path="motoristas" element={<AdminPlaceholder title="Motoristas" />} />
              <Route path="postos" element={<AdminPlaceholder title="Postos" />} />
              <Route path="veiculos" element={<AdminPlaceholder title="Veículos" />} />
              <Route path="empresas" element={<AdminPlaceholder title="Empresas" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
