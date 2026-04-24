---
name: project-index
description: ASERP MVP rules - empresa/posto padrão e fluxo motorista
type: feature
---
# Project Memory

## Core
Cadastro público liberado: novo usuário entra sempre como motorista (vinculado automaticamente à empresa ASERP e posto SMSUB via trigger handle_new_user). Admin promovido só por SQL/processo controlado (breno.fred.1321@gmail.com auto-promovido).
Senha: mínimo Supabase, sem checagem HIBP. Mensagens em PT.
Empresa padrão ID: 00000000-0000-0000-0000-000000000001 (ASERP). Posto padrão ID: 00000000-0000-0000-0000-000000000002 (SMSUB).
Visual: branco/preto/laranja (--primary 22 94% 52%).
Fluxo motorista: placa livre via ensureVeiculoByPlaca em src/lib/registros.ts. Turno noturno: resolveSaidaAt avança 1 dia se saída <= entrada.
Triggers DB: km_rodados auto-calculado, validate_registro (km/horário), unique(motorista_id, data_referencia, veiculo_id).

## Memories
