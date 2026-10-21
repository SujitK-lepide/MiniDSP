create type public.risk_level as enum ('None','Low','Medium','High','Critical');
create type public.detector_type as enum ('email','uk_phone','uk_nino','payment_card');
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  filename text not null check (char_length(filename) between 1 and 255),
  size_bytes int not null check (size_bytes between 1 and 1048576),
  risk public.risk_level not null,
  total_findings int not null default 0 check (total_findings >= 0),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  user_id uuid not null default auth.uid(),
  detector public.detector_type not null,
  risk public.risk_level not null,
  occurrences int not null check (occurrences > 0),
  masked_example text not null check (char_length(masked_example) <= 64),
  created_at timestamptz not null default now(),
  foreign key (scan_id, user_id) references public.scans(id, user_id) on delete cascade,
  unique (scan_id, detector)
);
create index on public.scans (user_id, created_at desc);
create index on public.findings (user_id, detector, risk);
alter table public.scans enable row level security;
alter table public.findings enable row level security;
revoke all on public.scans, public.findings from anon;
create policy scans_select on public.scans for select to authenticated using (user_id = (select auth.uid()));
create policy scans_insert on public.scans for insert to authenticated with check (user_id = (select auth.uid()));
create policy scans_delete on public.scans for delete to authenticated using (user_id = (select auth.uid()));
create policy findings_select on public.findings for select to authenticated using (user_id = (select auth.uid()));
create policy findings_insert on public.findings for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.scans s where s.id = scan_id and s.user_id = (select auth.uid())));
create or replace function public.save_scan(
  p_filename text, p_size_bytes int, p_risk public.risk_level, p_findings jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_total int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select coalesce(sum((f->>'occurrences')::int),0) into v_total from jsonb_array_elements(p_findings) f;
  insert into public.scans (user_id, filename, size_bytes, risk, total_findings)
    values (auth.uid(), p_filename, p_size_bytes, p_risk, v_total) returning id into v_id;
  insert into public.findings (scan_id, user_id, detector, risk, occurrences, masked_example)
    select v_id, auth.uid(), (f->>'detector')::public.detector_type, (f->>'risk')::public.risk_level,
           (f->>'occurrences')::int, f->>'masked_example'
    from jsonb_array_elements(p_findings) f;
  return v_id;
end $$;
revoke execute on function public.save_scan from public, anon;
grant execute on function public.save_scan to authenticated;
