-- Row-level security. Default deny; explicit allow per role.

-- profiles: owner-only r/w.
create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id);

-- user_roles: read own; writes are admin-only.
create policy "user_roles_self_select" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "user_roles_admin_write" on public.user_roles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- subscriptions: owner r; writes via service role only (edge fn).
create policy "subs_owner_select" on public.user_subscriptions
  for select using (auth.uid() = user_id);

-- credits: owner r; writes service role only.
create policy "credits_owner_select" on public.user_credits
  for select using (auth.uid() = user_id);

-- unlocks: owner r; writes service role only.
create policy "unlocks_owner_select" on public.content_unlocks
  for select using (auth.uid() = user_id);

-- picks: public read, writes via service role (generate-picks edge fn).
create policy "picks_public_read" on public.picks
  for select using (status_active = true);

create policy "matches_public_read" on public.matches
  for select using (true);

create policy "closing_odds_public_read" on public.closing_odds
  for select using (true);

create policy "settlements_public_read" on public.pick_settlements
  for select using (true);

create policy "pick_analyses_public_read" on public.pick_analyses
  for select using (true);

create policy "postgame_analyses_public_read" on public.postgame_analyses
  for select using (true);

-- tracked picks: owner only; Pro or credit requirement enforced in track-pick edge fn.
create policy "tracked_owner_select" on public.tracked_picks
  for select using (auth.uid() = user_id);
create policy "tracked_owner_modify" on public.tracked_picks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- strategy profiles: owner.
create policy "strategy_owner_all" on public.strategy_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- compliance: owner read. Writes via service role.
create policy "compliance_owner_select" on public.compliance_checks
  for select using (auth.uid() = user_id);
create policy "age_owner_all" on public.age_verifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rg_owner_all" on public.rg_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- disputes: owner creates; admin resolves.
create policy "dispute_owner_insert" on public.settlement_disputes
  for insert with check (auth.uid() = user_id);
create policy "dispute_owner_select" on public.settlement_disputes
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "dispute_admin_update" on public.settlement_disputes
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- audit logs: admin only.
create policy "audit_admin_select" on public.audit_logs
  for select using (public.is_admin(auth.uid()));
