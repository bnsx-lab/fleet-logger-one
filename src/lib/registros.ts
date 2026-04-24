import { supabase } from "@/integrations/supabase/client";

export const EMPRESA_PADRAO_ID = "00000000-0000-0000-0000-000000000001";
export const POSTO_PADRAO_ID = "00000000-0000-0000-0000-000000000002";

export const normalizePlaca = (raw: string) =>
  raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);

/** Garante a existência do veículo pela placa (cria se não existir). Retorna o veiculo_id. */
export const ensureVeiculoByPlaca = async (placaInput: string, empresaId: string): Promise<string> => {
  const placa = normalizePlaca(placaInput);
  if (placa.length < 5) throw new Error("Placa inválida.");

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
