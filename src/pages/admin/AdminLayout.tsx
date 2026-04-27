import { Outlet } from "react-router-dom";
import { AppShell } from "@/components/AppShell";

const nav = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/registros", label: "Registros" },
  { to: "/admin/motoristas", label: "Motoristas" },
  { to: "/admin/usuarios", label: "Usuários" },
  { to: "/admin/veiculos", label: "Veículos" },
];

export const AdminLayout = () => (
  <AppShell title="Admin" nav={nav}>
    <Outlet />
  </AppShell>
);

export default AdminLayout;
