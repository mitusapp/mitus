create table if not exists users (
  id uuid primary key,
  email text,
  name text,
  created_at timestamp with time zone default now()
);

create table if not exists invitations (
  id text primary key,
  user_id uuid,
  title text not null,
  event_type text not null,
  language text not null default 'es',
  status text not null default 'draft', -- draft|published
  slug text unique,
  passcode_required boolean default false,
  passcode_hash text,
  intro_message text,
  theme text,
  hero_image_url text,
  -- trial & payment
  is_trial boolean not null default false,
  trial_token text unique,
  trial_expires_at timestamp with time zone,
  payment_status text not null default 'unpaid', -- unpaid|paid
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists invitation_parts (
  id bigserial primary key,
  invitation_id text not null references invitations(id) on delete cascade,
  type text not null,
  date text not null,
  time text not null,
  place_name text not null,
  address text not null,
  lat double precision,
  lng double precision,
  notes text,
  sort_order int not null default 0
);

create table if not exists guests (
  id bigserial primary key,
  invitation_id text not null references invitations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  side text,
  group_name text
);

create table if not exists rsvps (
  id bigserial primary key,
  invitation_id text not null references invitations(id) on delete cascade,
  guest_id bigint references guests(id) on delete set null,
  name text not null,
  email text,
  phone text,
  attending text not null,
  party_size int,
  message text,
  created_at timestamp with time zone default now()
);

create table if not exists assets (
  id bigserial primary key,
  invitation_id text not null references invitations(id) on delete cascade,
  type text not null,
  url text not null,
  width int,
  height int,
  created_at timestamp with time zone default now()
);

create table if not exists metrics (
  id bigserial primary key,
  invitation_id text,
  slug text,
  event text not null,
  user_agent text,
  ip_hash text,
  created_at timestamp with time zone default now()
);

create table if not exists templates (
  id text primary key,
  name text not null,
  description text,
  cover_image text,
  theme_defaults_json jsonb,
  is_active boolean default true
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on invitations;
create trigger set_updated_at before update on invitations
for each row execute procedure set_updated_at();

create index if not exists invitations_user_idx on invitations(user_id);
create index if not exists invitations_slug_idx on invitations(slug);
create index if not exists invitations_trial_idx on invitations(trial_token);
create index if not exists parts_inv_idx on invitation_parts(invitation_id);
create index if not exists rsvps_inv_idx on rsvps(invitation_id);