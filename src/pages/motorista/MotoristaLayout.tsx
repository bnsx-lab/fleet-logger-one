import { Outlet } from "react-router-dom";
import { AppShell } from "@/components/AppShell";

const nav = [
  { to: "/app", label: "Início" },
  { to: "/app/historico", label: "Histórico" },
];

export const MotoristaLayout = () => (
  <AppShell title="Motorista" nav={nav}>
    <Outlet />
  </AppShell>
);

export default MotoristaLayout;
