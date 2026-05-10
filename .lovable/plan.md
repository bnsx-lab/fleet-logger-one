
# Plano de evolução — Controle de BDT (ASERP / SMSUB)

Objetivo: evoluir o sistema sem refazer nada. Foco em fluxo real do motorista, controle do admin e melhorias visuais. Stack mantida (React + Vite + TS + Supabase + Tailwind + shadcn).

## 1. Banco de dados (uma migração)

Alterações na tabela `registros`:
- Novo enum `registro_status` com valores: `rascunho`, `em_andamento`, `finalizado`, `pendente` (legado), `revisado`, `aprovado`, `corrigido`, `cancelado`. Default passa a `rascunho`.
- `km_volta` e `saida_at` viram NULL (preenchidos só na finalização).
- Trigger `set_km_rodados` ajustada: só calcula quando ambos `km_saida` e `km_volta` estão presentes; senão `km_rodados = 0`.
- Trigger `validate_registro` ajustada: só valida quando saída/volta presentes.
- Adicionar coluna `enviado_at timestamptz null` para diferenciar rascunho de enviado.

Nova tabela `registro_fotos`:
- `id`, `registro_id (fk registros)`, `profile_id`, `foto_path text`, `tipo text null` (veiculo/painel/documento/comprovante/ocorrencia/outro), `created_at`.
- RLS: select próprio ou admin; insert se for dono do registro; delete se for dono dentro de 24h ou admin.
- Migração mantém `foto_path` em `registros` para compatibilidade, mas todo upload novo vai para `registro_fotos`.

Storage: bucket `registro-fotos` já existe (público). Manter.

## 2. Camada de utilitários (`src/lib/registros.ts`)

- Novos tipos de status.
- Funções: `criarRascunhoSaida`, `iniciarSaida` (sai de rascunho → em_andamento + define `entrada_at`), `finalizarSaida`, `enviarRascunhos(ids)`.
- `uploadFotosRegistro(userId, registroId, files[], tipo?)` com compressão simples via `<canvas>` (resize máx 1600px, JPEG 0.82) e inserção em lote em `registro_fotos`.
- `listarFotosDoRegistro(registroId)`, `removerFoto(id)`.
- `calcularTotaisPorPlaca({ from, to, placa? })` agregando apenas registros `finalizado`.

## 3. Fluxo do motorista

Rotas novas/atualizadas dentro de `/app`:
- `/app` (Home): cards "Nova saída", "Em andamento", "Rascunhos", "Último registro", "Total do dia".
- `/app/novo` → vira "Iniciar saída" (data, KM inicial, hora, placa, observação, fotos múltiplas). Salva como `em_andamento`.
- `/app/em-andamento` → lista registros em andamento; cada um tem botão **Finalizar**.
- `/app/registros/:id/finalizar` → KM final, hora retorno, fotos, observação. Calcula KM e duração; marca `finalizado`.
- `/app/rascunhos` → lista rascunhos com botão **Enviar BDTs** (envia em lote: muda status p/ `finalizado` se completo, ou `em_andamento` se faltou finalizar; define `enviado_at`).
- `/app/historico` → cards melhorados com fotos (thumb), duração, status colorido.
- `/app/registros/:id/editar` → mantida, respeitando regra 24h.

Componentes:
- `<MultiPhotoUpload />` reutilizável: input múltiplo, preview em grid, remover antes de salvar, compressão.
- `<StatusBadge />` ampliado com `rascunho`, `em_andamento`, `finalizado`.

UX mobile:
- `inputMode="numeric"` nos KM, `type="time"` para hora.
- Botão salvar fixo (`sticky bottom-0`) nos formulários no mobile.
- Loading + disable para evitar duplo clique.

## 4. Fluxo do admin

- **Dashboard**: adicionar cards "KM no mês", "Veículos mais usados (top 5)", "Motoristas mais ativos", "Em andamento", "Total de fotos".
- **Registros**: filtro adicional por status incluindo `em_andamento`/`finalizado`/`rascunho`; chips de cor discreta.
- **Nova aba "Imagens"** (`/admin/imagens`): grid responsivo de fotos com filtros (motorista, placa, período); clique abre lightbox (Dialog) com motorista/placa/data/status e link para o registro; botão baixar.
- **Nova aba "Totalizador"** (`/admin/totalizador`): filtros (mês ou período custom, placa). Tabela: Placa | KM | Saídas | Média/dia | Top motorista | Última utilização. Exporta CSV/PDF.
- AdminLayout: incluir "Imagens" e "Totalizador" no menu.

## 5. Busca global

Campo de busca no header do AppShell admin: busca por placa, nome de motorista ou trecho de observação → leva a `/admin/registros?q=...`.

## 6. Segurança & estabilidade

- RLS de `registros` mantém regra; ajustar policy de insert para aceitar status inicial `rascunho`/`em_andamento` sem exigir `km_volta`.
- Validações Zod nos formulários novos.
- Toast de erro/sucesso consistente; nada some silenciosamente.

## 7. Identidade visual

- Mantém branco/preto/laranja, tokens semânticos do `index.css`.
- Cards com mesmo estilo já usado; sem cores hard-coded.

## 8. O que NÃO muda

- Auth, cadastro público como motorista, aprovação por admin.
- Empresa ASERP / Posto SMSUB padrão.
- Edge function `admin-delete-user`.
- Stack, rotas existentes que já funcionam.

## Ordem de execução

1. Migração SQL (enum + colunas + tabela `registro_fotos` + RLS + triggers).
2. `src/lib/registros.ts` + componente `<MultiPhotoUpload />`.
3. Fluxo motorista (Home, Iniciar, Em andamento, Finalizar, Rascunhos, Histórico).
4. Admin: Imagens, Totalizador, Dashboard, Registros (filtros/badges), AdminLayout (menu + busca).
5. StatusBadge, ProtectedRoute (sem mudanças), ajustes finais de textos.
6. Testar build.

Confirma para eu seguir com a migração e a implementação?
