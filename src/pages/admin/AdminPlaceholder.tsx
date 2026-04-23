// Página placeholder para gestão de entidades — implementada na próxima fase.
const AdminPlaceholder = ({ title }: { title: string }) => (
  <div className="space-y-3">
    <h1 className="text-2xl font-bold">{title}</h1>
    <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
      Esta gestão será habilitada na próxima entrega (CRUD completo).
    </div>
  </div>
);

export default AdminPlaceholder;
