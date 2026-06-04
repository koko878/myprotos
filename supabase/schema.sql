-- Schéma iasser pour Supabase.
-- À exécuter dans Supabase → SQL Editor → New query → coller → Run.
--
-- Modèle : chaque utilisateur a un profil avec un rôle (client | admin).
-- Un client ne voit/modifie que SES projets ; l'admin voit/modifie TOUT.

-- 1) PROFILS ----------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  role text not null default 'client' check (role in ('client','admin')),
  age int,
  secteur text,
  entreprise text,
  cree_le timestamptz not null default now()
);

-- Migration (si la table existe déjà) : ajoute les colonnes de profil client.
alter table public.profiles add column if not exists age int;
alter table public.profiles add column if not exists secteur text;
alter table public.profiles add column if not exists entreprise text;

alter table public.profiles enable row level security;

-- Chacun lit/écrit son propre profil ; l'admin lit tout.
create policy "profil: lecture self" on public.profiles
  for select using (auth.uid() = id);
create policy "profil: maj self" on public.profiles
  for update using (auth.uid() = id);

-- Crée automatiquement un profil à l'inscription.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper : l'utilisateur courant est-il admin ?
create or replace function public.est_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 2) PROJETS ----------------------------------------------------------------
-- Le use case complet est stocké en JSONB (souple : on garde la même structure
-- que l'app sans multiplier les colonnes).
create table if not exists public.projets (
  id uuid primary key default gen_random_uuid(),
  proprietaire uuid not null references auth.users on delete cascade,
  donnees jsonb not null,            -- l'objet UseCase complet
  statut text not null default 'brouillon',
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

create index if not exists projets_proprietaire_idx on public.projets (proprietaire);
create index if not exists projets_statut_idx on public.projets (statut);

alter table public.projets enable row level security;

-- Le client gère ses propres projets ; l'admin a tous les droits.
create policy "projets: lecture" on public.projets
  for select using (auth.uid() = proprietaire or public.est_admin());
create policy "projets: insertion" on public.projets
  for insert with check (auth.uid() = proprietaire);
create policy "projets: maj" on public.projets
  for update using (auth.uid() = proprietaire or public.est_admin());
create policy "projets: suppression" on public.projets
  for delete using (auth.uid() = proprietaire or public.est_admin());

-- 3) RÉGLAGES (overrides de prompts des agents IA) --------------------------
-- Clé/valeur partagé : l'admin édite les prompts, TOUS les utilisateurs (clients
-- inclus) les lisent — indispensable car les agents tournent côté client.
create table if not exists public.reglages (
  cle text primary key,
  valeur text not null,
  maj_le timestamptz not null default now()
);

alter table public.reglages enable row level security;

-- Lecture pour tout utilisateur authentifié ; écriture réservée à l'admin.
create policy "reglages: lecture" on public.reglages
  for select using (auth.role() = 'authenticated');
create policy "reglages: insertion admin" on public.reglages
  for insert with check (public.est_admin());
create policy "reglages: maj admin" on public.reglages
  for update using (public.est_admin());
create policy "reglages: suppression admin" on public.reglages
  for delete using (public.est_admin());

-- 4) Te promouvoir ADMIN (à faire une fois, après ta 1ère connexion) --------
-- Remplace l'email puis exécute :
--   update public.profiles set role = 'admin' where email = 'TON_EMAIL';
