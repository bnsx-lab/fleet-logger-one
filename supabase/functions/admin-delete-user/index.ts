// Edge function: exclui um usuário (admin only).
// Usa SUPABASE_SERVICE_ROLE_KEY para excluir do auth e cascata na tabela profiles.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

  // Cliente "como o caller" para verificar se é admin
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerId = userData.user.id;

  const { data: isAdminRows, error: roleErr } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr || !isAdminRows) {
    return new Response(JSON.stringify({ error: "Apenas administradores podem excluir usuários." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const targetId: string | undefined = body?.userId;
  if (!targetId) {
    return new Response(JSON.stringify({ error: "userId obrigatório" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (targetId === callerId) {
    return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Limpa dados dependentes (registros, motoristas, user_roles, profiles) — registros pertencem ao motorista.
  await admin.from("registros").delete().eq("profile_id", targetId);
  await admin.from("motorista_veiculos").delete().in("motorista_id",
    (await admin.from("motoristas").select("id").eq("profile_id", targetId)).data?.map((r: any) => r.id) ?? ["00000000-0000-0000-0000-000000000000"]
  );
  await admin.from("motoristas").delete().eq("profile_id", targetId);
  await admin.from("user_roles").delete().eq("user_id", targetId);
  await admin.from("profiles").delete().eq("id", targetId);

  const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
