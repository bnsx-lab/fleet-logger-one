import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Send, Trash2, Pencil, Loader2 } from "lucide-react";
import { formatDate, formatNumber } from "@/lib/format";

type Row = {
  id: string;
  data_referencia: string;
  km_saida: number;
  km_volta: number | null;
  km_rodados: number;
  saida_at: string | null;
  veiculos: { placa: string } | null;
};

const MotoristaRascunhos = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { document.title = "Meus rascunhos | Controle de BDT"; }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("registros")
      .select("id, data_referencia, km_saida, km_volta, km_rodados, saida_at, veiculos(placa)")
      .eq("profile_id", user.id).eq("status", "rascunho")
      .order("data_referencia", { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const enviarTodos = async () => {
    if (!user || rows.length === 0) return;
    if (!confirm(`Enviar ${rows.length} BDT(s)? Após o envio você só poderá editar nas próximas 24h.`)) return;
    setEnviando(true);
    const ids = rows.map((r) => r.id);
    // Finaliza os que estão completos; mantém em_andamento se faltou km_volta/saida_at
    const completos = rows.filter((r) => r.km_volta != null && r.saida_at != null).map((r) => r.id);
    const incompletos = rows.filter((r) => r.km_volta == null || r.saida_at == null).map((r) => r.id);
    const now = new Date().toISOString();
    let okCount = 0;
    if (completos.length > 0) {
      const { error } = await supabase.from("registros").update({
        status: "finalizado", enviado_at: now,
      } as any).in("id", completos);
      if (!error) okCount += completos.length;
    }
    if (incompletos.length > 0) {
      const { error } = await supabase.from("registros").update({
        status: "em_andamento",
      } as any).in("id", incompletos);
      if (!error) okCount += incompletos.length;
    }
    setEnviando(false);
    if (okCount === ids.length) toast.success(`${okCount} BDT(s) enviado(s)!`);
    else toast.warning(`Enviado(s): ${okCount}/${ids.length}`);
    load();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este rascunho?")) return;
    const { error } = await supabase.from("registros").delete().eq("id", id);
    if (error) toast.error("Não foi possível excluir.");
    else { toast.success("Rascunho excluído."); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus rascunhos</h1>
          <p className="text-sm text-muted-foreground">{loading ? "Carregando..." : `${rows.length} rascunho(s)`}</p>
        </div>
        {rows.length > 0 && (
          <Button onClick={enviarTodos} disabled={enviando}>
            {enviando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            Enviar BDTs
          </Button>
        )}
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Sem rascunhos"
          description="Quando você salvar um BDT como rascunho, ele aparecerá aqui esperando o envio."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{formatDate(r.data_referencia)}</span>
                <span className="text-xs text-muted-foreground">{r.veiculos?.placa ?? "—"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                KM: {formatNumber(r.km_saida)} → {r.km_volta != null ? formatNumber(r.km_volta) : "—"}
                {r.km_volta != null && <> · <b>{formatNumber(r.km_rodados)} km</b></>}
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/app/registros/${r.id}/editar`}><Pencil className="mr-1 h-3.5 w-3.5" /> Editar</Link>
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => excluir(r.id)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MotoristaRascunhos;
