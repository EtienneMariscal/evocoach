-- Datos de SEMILLA SOLO PARA ENTORNO LOCAL (`supabase db reset`).
-- Nunca se ejecuta en staging ni en producción: allí no se usa `--include-seed`, y además este
-- fichero se niega a correr si encuentra usuarios que no sean de prueba.
--
-- Usuarios de prueba (todos con la contraseña local indicada abajo y el correo ya verificado):
--   pro-a, pro-b, pro-sin-vinculo, cli-a, cli-b, cli-sin-rol  @evocoach.test
-- En T1.3 las filas de `profiles` las crea el trigger `handle_new_user`; los roles, vínculos y
-- planes de prueba se añaden en T1.14 (harness pgTAP). Los UUID son fijos para poder referirlos.

do $$
begin
  if exists (select 1 from auth.users where email not like '%@evocoach.test') then
    raise exception 'seed.sql solo debe ejecutarse en una base local con usuarios de prueba';
  end if;
end
$$;

create temporary table _seed_users (id uuid primary key, email text not null) on commit drop;

insert into _seed_users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'pro-a@evocoach.test'),
  ('22222222-2222-4222-8222-222222222222', 'pro-b@evocoach.test'),
  ('33333333-3333-4333-8333-333333333333', 'pro-sin-vinculo@evocoach.test'),
  ('44444444-4444-4444-8444-444444444444', 'cli-a@evocoach.test'),
  ('55555555-5555-4555-8555-555555555555', 'cli-b@evocoach.test'),
  ('66666666-6666-4666-8666-666666666666', 'cli-sin-rol@evocoach.test');

-- Los campos de token van a '' (no NULL): GoTrue falla al leer usuarios con esas columnas nulas.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('evocoach-local-2026', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', ''
from _seed_users u
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from _seed_users u
on conflict (provider_id, provider) do nothing;
