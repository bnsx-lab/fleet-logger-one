import { AdminEntidadeCRUD } from "./AdminEntidadeCRUD";
import { supabase } from "@/integrations/supabase/client";

const AdminVeiculos = () => (
  <AdminEntidadeCRUD
    title="Veículos"
    table="veiculos"
    selectColumns="id, placa, descricao, status, empresa_id, empresas(nome)"
    columnHeaders={["Placa", "Empresa", "Descrição"]}
    fields={[
      { name: "placa", label: "Placa", required: true, uppercase: true, maxLength: 8 },
      { name: "empresa_id", label: "Empresa", required: true, type: "select" },
      { name: "descricao", label: "Descrição", maxLength: 200 },
    ]}
    renderRow={(r: any) => [
      <span className="font-mono font-semibold">{r.placa}</span>,
      r.empresas?.nome ?? "—",
      r.descricao ?? "—",
    ]}
    searchAccessor={(r: any) => `${r.placa} ${r.empresas?.nome ?? ""}`}
    preload={async () => {
      const { data } = await supabase.from("empresas").select("id, nome").order("nome");
      return { empresa_id: (data ?? []).map((e: any) => ({ id: e.id, label: e.nome })) };
    }}
  />
);

export default AdminVeiculos;
