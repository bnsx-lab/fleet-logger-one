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
import Cadastro from "./pages/Cadastro";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRegistros from "./pages/admin/AdminRegistros";
import AdminRegistroDetalhe from "./pages/admin/AdminRegistroDetalhe";
import AdminMotoristas from "./pages/admin/AdminMotoristas";
import AdminPostos from "./pages/admin/AdminPostos";
import AdminVeiculos from "./pages/admin/AdminVeiculos";
import AdminEmpresas from "./pages/admin/AdminEmpresas";
import AdminUsuarios from "./pages/admin/AdminUsuarios";

import MotoristaLayout from "./pages/motorista/MotoristaLayout";
import MotoristaHome from "./pages/motorista/MotoristaHome";
import MotoristaHistorico from "./pages/motorista/MotoristaHistorico";
import MotoristaNovoRegistro from "./pages/motorista/MotoristaNovoRegistro";
import MotoristaSucesso from "./pages/motorista/MotoristaSucesso";

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
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />

            {/* Motorista */}
            <Route
              path="/app"
              element={<ProtectedRoute><MotoristaLayout /></ProtectedRoute>}
            >
              <Route index element={<MotoristaHome />} />
              <Route path="novo" element={<MotoristaNovoRegistro />} />
              <Route path="sucesso" element={<MotoristaSucesso />} />
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
              <Route path="motoristas" element={<AdminMotoristas />} />
              <Route path="postos" element={<AdminPostos />} />
              <Route path="veiculos" element={<AdminVeiculos />} />
              <Route path="empresas" element={<AdminEmpresas />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
