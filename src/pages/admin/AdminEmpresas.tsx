import { AdminEntidadeCRUD } from "./AdminEntidadeCRUD";

const AdminEmpresas = () => (
  <AdminEntidadeCRUD
    title="Empresas"
    table="empresas"
    selectColumns="id, nome, status"
    columnHeaders={["Nome"]}
    fields={[{ name: "nome", label: "Nome", required: true, maxLength: 120 }]}
    renderRow={(r: any) => [<span className="font-medium">{r.nome}</span>]}
    searchAccessor={(r: any) => r.nome}
  />
);

export default AdminEmpresas;
