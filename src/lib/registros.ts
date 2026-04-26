import { supabase } from "@/integrations/supabase/client";

export const EMPRESA_PADRAO_ID = "00000000-0000-0000-0000-000000000001";
export const POSTO_PADRAO_ID = "00000000-0000-0000-0000-000000000002";

/** Aceita ABC1234, ABC-1234, ABC1D23 etc. Remove tudo que não é alfanumérico, maiúsculo, máx 7. */
export const normalizePlaca = (raw: string) =>
  (raw || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);

/** Validação flexível: 7 caracteres alfanuméricos, com ao menos 3 letras e ao menos 3 dígitos.
 *  Cobre antiga (ABC1234) e Mercosul (ABC1D23).
 */
export const isPlacaValida = (raw: string): boolean => {
  const p = normalizePlaca(raw);
  if (p.length !== 7) return false;
  const letters = (p.match(/[A-Z]/g) ?? []).length;
  const digits = (p.match(/[0-9]/g) ?? []).length;
  return letters >= 3 && digits >= 3;
};

/** Garante a existência do veículo pela placa (cria se não existir). Retorna o veiculo_id. */
export const ensureVeiculoByPlaca = async (placaInput: string, empresaId: string): Promise<string> => {
  const placa = normalizePlaca(placaInput);
  if (!isPlacaValida(placa)) throw new Error("Placa inválida.");

  const { data: existing, error: selErr } = await supabase
    .from("veiculos")
    .select("id, status")
    .eq("placa", placa)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing.id;

  const { data: created, error: insErr } = await supabase
    .from("veiculos")
    .insert({ placa, empresa_id: empresaId, status: "ativo" })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return created.id;
};

/** Combina data (YYYY-MM-DD) + hora (HH:mm) em ISO. */
export const combineDateTime = (date: string, time: string): string => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

/** Se a saída for cronologicamente antes da entrada (turno noturno), avança 1 dia. */
export const resolveSaidaAt = (entradaIso: string, dataRef: string, horaSaida: string): string => {
  const [h, m] = horaSaida.split(":").map(Number);
  const entrada = new Date(entradaIso);
  const saida = new Date(`${dataRef}T00:00:00`);
  saida.setHours(h, m, 0, 0);
  if (saida.getTime() <= entrada.getTime()) {
    saida.setDate(saida.getDate() + 1);
  }
  return saida.toISOString();
};

/** Retorna true se o registro ainda está dentro da janela de 24h (motorista pode editar). */
export const podeMotoristaEditar = (createdAtIso: string): boolean => {
  const created = new Date(createdAtIso).getTime();
  return Date.now() - created < 24 * 60 * 60 * 1000;
};

/** URL pública da foto no bucket. */
export const fotoPublicUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  return supabase.storage.from("registro-fotos").getPublicUrl(path).data.publicUrl;
};

/** Faz upload da foto do registro. Caminho: {userId}/{registroId-ou-uuid}-{ts}.{ext} */
export const uploadFotoRegistro = async (userId: string, file: File): Promise<string> => {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("registro-fotos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
};
