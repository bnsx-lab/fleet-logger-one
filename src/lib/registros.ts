import { supabase } from "@/integrations/supabase/client";

export const EMPRESA_PADRAO_ID = "00000000-0000-0000-0000-000000000001";
export const POSTO_PADRAO_ID = "00000000-0000-0000-0000-000000000002";

export type RegistroStatus =
  | "rascunho"
  | "em_andamento"
  | "finalizado"
  | "pendente"
  | "revisado"
  | "aprovado"
  | "corrigido"
  | "cancelado";

/** Considera "enviado/concluído" para fins de relatórios e admin. */
export const STATUS_FINAIS: RegistroStatus[] = ["finalizado", "pendente", "revisado", "aprovado", "corrigido"];

export const normalizePlaca = (raw: string) =>
  (raw || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);

export const isPlacaValida = (raw: string): boolean => {
  const p = normalizePlaca(raw);
  if (p.length !== 7) return false;
  const letters = (p.match(/[A-Z]/g) ?? []).length;
  const digits = (p.match(/[0-9]/g) ?? []).length;
  return letters >= 3 && digits >= 3;
};

export const ensureVeiculoByPlaca = async (placaInput: string, empresaId: string): Promise<string> => {
  const placa = normalizePlaca(placaInput);
  if (!isPlacaValida(placa)) throw new Error("Placa inválida.");
  const { data: existing, error: selErr } = await supabase
    .from("veiculos").select("id").eq("placa", placa).maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing.id;
  const { data: created, error: insErr } = await supabase
    .from("veiculos").insert({ placa, empresa_id: empresaId, status: "ativo" }).select("id").single();
  if (insErr) throw insErr;
  return created.id;
};

export const combineDateTime = (date: string, time: string): string => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const resolveSaidaAt = (entradaIso: string, dataRef: string, horaSaida: string): string => {
  const [h, m] = horaSaida.split(":").map(Number);
  const entrada = new Date(entradaIso);
  const saida = new Date(`${dataRef}T00:00:00`);
  saida.setHours(h, m, 0, 0);
  if (saida.getTime() <= entrada.getTime()) saida.setDate(saida.getDate() + 1);
  return saida.toISOString();
};

export const podeMotoristaEditar = (createdAtIso: string): boolean =>
  Date.now() - new Date(createdAtIso).getTime() < 24 * 60 * 60 * 1000;

export const fotoPublicUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  return supabase.storage.from("registro-fotos").getPublicUrl(path).data.publicUrl;
};

/** Compressão simples client-side (canvas). Reduz para 1600px no maior lado, JPEG ~0.82. */
export const compressImage = async (file: File, maxDim = 1600, quality = 0.82): Promise<File> => {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file).catch(() => null);
    const w0 = bmp?.width ?? 0;
    const h0 = bmp?.height ?? 0;
    if (!bmp || (w0 <= maxDim && h0 <= maxDim && file.size < 1_500_000)) return file;
    const ratio = Math.min(maxDim / w0, maxDim / h0, 1);
    const w = Math.round(w0 * ratio);
    const h = Math.round(h0 * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
};

/** Faz upload de uma foto e retorna o path. */
export const uploadFotoRegistro = async (userId: string, file: File): Promise<string> => {
  const compressed = await compressImage(file);
  const ext = (compressed.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("registro-fotos").upload(path, compressed, {
    cacheControl: "3600", upsert: false, contentType: compressed.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
};

/** Faz upload de múltiplas fotos e insere em registro_fotos. Retorna paths. */
export const uploadFotosRegistro = async (
  userId: string, registroId: string, files: File[], tipo?: string,
): Promise<string[]> => {
  const paths: string[] = [];
  for (const f of files) {
    try {
      const p = await uploadFotoRegistro(userId, f);
      paths.push(p);
      await supabase.from("registro_fotos").insert({
        registro_id: registroId, profile_id: userId, foto_path: p, tipo: tipo ?? null,
      });
    } catch (e) {
      console.error("Falha ao enviar foto", e);
    }
  }
  return paths;
};

export type FotoRegistro = { id: string; foto_path: string; tipo: string | null; created_at: string };

export const listarFotosDoRegistro = async (registroId: string): Promise<FotoRegistro[]> => {
  const { data } = await supabase
    .from("registro_fotos")
    .select("id, foto_path, tipo, created_at")
    .eq("registro_id", registroId)
    .order("created_at", { ascending: true });
  return (data as any) ?? [];
};

export const removerFoto = async (id: string): Promise<void> => {
  const { error } = await supabase.from("registro_fotos").delete().eq("id", id);
  if (error) throw error;
};

/** Duração em minutos entre entrada_at e saida_at. Null se algum não preenchido. */
export const duracaoMinutos = (entrada: string | null, saida: string | null): number | null => {
  if (!entrada || !saida) return null;
  return Math.max(0, Math.round((new Date(saida).getTime() - new Date(entrada).getTime()) / 60000));
};

export const formatDuracao = (mins: number | null): string => {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
};

/** Totalizador por placa: agrega apenas registros finalizados/enviados. */
export type TotalizadorRow = {
  placa: string;
  veiculo_id: string;
  km_total: number;
  saidas: number;
  media_dia: number;
  top_motorista: string;
  ultima_utilizacao: string | null;
};

export const calcularTotaisPorPlaca = async (params: {
  from?: string; to?: string; placa?: string;
}): Promise<TotalizadorRow[]> => {
  let q = supabase
    .from("registros")
    .select("id, data_referencia, km_rodados, motoristas(nome_exibicao), veiculos!inner(id, placa)")
    .in("status", STATUS_FINAIS as any)
    .limit(5000);
  if (params.from) q = q.gte("data_referencia", params.from);
  if (params.to) q = q.lte("data_referencia", params.to);
  if (params.placa) q = q.eq("veiculos.placa", normalizePlaca(params.placa));
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data as any[]) ?? [];

  const map = new Map<string, {
    placa: string; veiculo_id: string; km: number; saidas: number;
    datas: Set<string>; ultima: string | null; motoristas: Map<string, number>;
  }>();
  for (const r of rows) {
    const placa = r.veiculos?.placa ?? "—";
    const vid = r.veiculos?.id ?? placa;
    const cur = map.get(vid) ?? {
      placa, veiculo_id: vid, km: 0, saidas: 0,
      datas: new Set<string>(), ultima: null, motoristas: new Map<string, number>(),
    };
    cur.km += Number(r.km_rodados) || 0;
    cur.saidas += 1;
    cur.datas.add(r.data_referencia);
    if (!cur.ultima || r.data_referencia > cur.ultima) cur.ultima = r.data_referencia;
    const nome = r.motoristas?.nome_exibicao ?? "—";
    cur.motoristas.set(nome, (cur.motoristas.get(nome) ?? 0) + 1);
    map.set(vid, cur);
  }
  return Array.from(map.values()).map((c) => {
    let top = "—"; let max = -1;
    for (const [n, q] of c.motoristas) if (q > max) { max = q; top = n; }
    const dias = Math.max(1, c.datas.size);
    return {
      placa: c.placa, veiculo_id: c.veiculo_id,
      km_total: c.km, saidas: c.saidas,
      media_dia: Math.round(c.km / dias),
      top_motorista: top,
      ultima_utilizacao: c.ultima,
    };
  }).sort((a, b) => b.km_total - a.km_total);
};
