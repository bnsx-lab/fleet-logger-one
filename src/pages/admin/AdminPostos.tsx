import { AdminEntidadeCRUD } from "./AdminEntidadeCRUD";
import { supabase } from "@/integrations/supabase/client";

const AdminPostos = () => (
  <AdminEntidadeCRUD
    title="Postos"
    table="postos"
    selectColumns="id, nome, endereco, status, empresa_id, empresas(nome)"
    columnHeaders={["Nome", "Empresa", "Endereço"]}
    fields={[
      { name: "nome", label: "Nome", required: true, maxLength: 120 },
      { name: "empresa_id", label: "Empresa", required: true, type: "select" },
      { name: "endereco", label: "Endereço", maxLength: 200 },
    ]}
    renderRow={(r: any) => [
      <span className="font-medium">{r.nome}</span>,
      r.empresas?.nome ?? "—",
      r.endereco ?? "—",
    ]}
    searchAccessor={(r: any) => `${r.nome} ${r.empresas?.nome ?? ""}`}
    preload={async () => {
      const { data } = await supabase.from("empresas").select("id, nome").order("nome");
      return { empresa_id: (data ?? []).map((e: any) => ({ id: e.id, label: e.nome })) };
    }}
  />
);

export default AdminPostos;
