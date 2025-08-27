alter table invitations enable row level security;
alter table invitation_parts enable row level security;
alter table guests enable row level security;
alter table rsvps enable row level security;
alter table assets enable row level security;
alter table templates enable row level security;
alter table metrics enable row level security;

-- Owner can CRUD their invitations
drop policy if exists "owner_crud_invitations" on invitations;
create policy "owner_crud_invitations" on invitations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read published & paid by slug
drop policy if exists "public_read_published_by_slug" on invitations;
create policy "public_read_published_by_slug" on invitations
for select using (status = 'published' and payment_status = 'paid');

-- Parts: owner read/write; public read for published
drop policy if exists "owner_crud_parts" on invitation_parts;
create policy "owner_crud_parts" on invitation_parts
for all using (
  exists (select 1 from invitations i where i.id = invitation_id and i.user_id = auth.uid())
) with check (
  exists (select 1 from invitations i where i.id = invitation_id and i.user_id = auth.uid())
);

drop policy if exists "public_read_parts_for_published" on invitation_parts;
create policy "public_read_parts_for_published" on invitation_parts
for select using (
  exists (select 1 from invitations i where i.id = invitation_id and i.status = 'published' and i.payment_status = 'paid')
);

-- Guests: owner only
drop policy if exists "owner_crud_guests" on guests;
create policy "owner_crud_guests" on guests
for all using (
  exists (select 1 from invitations i where i.id = invitation_id and i.user_id = auth.uid())
) with check (
  exists (select 1 from invitations i where i.id = invitation_id and i.user_id = auth.uid())
);

-- RSVPs: public insert, owner select
drop policy if exists "public_insert_rsvps" on rsvps;
create policy "public_insert_rsvps" on rsvps
for insert with check (true);

drop policy if exists "owner_read_rsvps" on rsvps;
create policy "owner_read_rsvps" on rsvps
for select using (
  exists (select 1 from invitations i where i.id = invitation_id and i.user_id = auth.uid())
);

-- Assets: owner crud
drop policy if exists "owner_crud_assets" on assets;
create policy "owner_crud_assets" on assets
for all using (
  exists (select 1 from invitations i where i.id = invitation_id and i.user_id = auth.uid())
) with check (
  exists (select 1 from invitations i where i.id = invitation_id and i.user_id = auth.uid())
);

-- Templates: public read
drop policy if exists "public_read_templates" on templates;
create policy "public_read_templates" on templates
for select using (true);

-- Metrics: public insert
drop policy if exists "public_insert_metrics" on metrics;
create policy "public_insert_metrics" on metrics
for insert with check (true);