-- All game mutations are narrow RPCs. Chess mutations require the Edge Function's
-- service credential AND an authenticated actor, then a locked revision check.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_ci on public.profiles (lower(username));
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using ((select auth.uid()) is not null);
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, username) values(new.id, trim(new.raw_user_meta_data->>'username'));
  return new;
end $$;
revoke all on function private.create_profile() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();

create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function private.touch_updated_at();

-- Only a public nickname availability bit is exposed before registration.
create function public.username_available(candidate text) returns boolean language sql stable security definer set search_path = '' as $$
  select candidate ~ '^[A-Za-z0-9_]{3,24}$' and not exists(select 1 from public.profiles where lower(username) = lower(candidate));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null check (room_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_by uuid not null references public.profiles(id),
  white_player_id uuid references public.profiles(id),
  black_player_id uuid references public.profiles(id),
  creator_color_preference text not null check (creator_color_preference in ('w','b','random')),
  status text not null default 'waiting' check (status in ('waiting','active','finished','cancelled')),
  initial_fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  current_fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn text not null default 'w' check (turn in ('w','b')),
  current_ply integer not null default 0 check (current_ply >= 0),
  revision integer not null default 0 check (revision >= current_ply),
  teams jsonb not null default '{"w":"libertadores","b":"realistas"}'::jsonb
    check (teams in ('{"w":"libertadores","b":"realistas"}'::jsonb, '{"w":"realistas","b":"libertadores"}'::jsonb)),
  result jsonb,
  draw_offer_by uuid references public.profiles(id),
  parent_game_id uuid unique references public.games(id),
  rematch_requested_by uuid references public.profiles(id),
  rematch_game_id uuid references public.games(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  check (white_player_id is null or black_player_id is null or white_player_id <> black_player_id),
  check (status not in ('active','finished') or (white_player_id is not null and black_player_id is not null)),
  check ((status = 'finished') = (result is not null)),
  check (draw_offer_by is null or (status = 'active' and draw_offer_by in (white_player_id, black_player_id))),
  check (rematch_requested_by is null or (status = 'finished' and rematch_requested_by in (white_player_id, black_player_id)))
);
create index games_creator on public.games(created_by, created_at desc);
create index games_white on public.games(white_player_id, created_at desc);
create index games_black on public.games(black_player_id, created_at desc);
create index games_draw_offer on public.games(draw_offer_by) where draw_offer_by is not null;
create index games_rematch_request on public.games(rematch_requested_by) where rematch_requested_by is not null;
create index games_rematch on public.games(rematch_game_id) where rematch_game_id is not null;
create trigger games_updated before update on public.games for each row execute function private.touch_updated_at();

create table public.game_moves (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id),
  ply integer not null check (ply > 0),
  player_id uuid not null references public.profiles(id),
  from_square text not null check (from_square ~ '^[a-h][1-8]$'),
  to_square text not null check (to_square ~ '^[a-h][1-8]$'),
  promotion text check (promotion in ('q','r','b','n')),
  san text not null,
  uci text not null check (uci ~ '^[a-h][1-8][a-h][1-8][qrbn]?$'),
  fen_before text not null,
  fen_after text not null,
  created_at timestamptz not null default now(),
  unique(game_id, ply)
);
create index game_moves_player on public.game_moves(player_id);
alter table public.games enable row level security;
alter table public.game_moves enable row level security;
revoke all on public.games, public.game_moves from anon, authenticated;
grant select on public.games, public.game_moves to authenticated;
create policy games_participants on public.games for select to authenticated using
  ((select auth.uid()) in (created_by, white_player_id, black_player_id));
create policy moves_participants on public.game_moves for select to authenticated using
  (exists(select 1 from public.games g where g.id = game_id and (select auth.uid()) in (g.white_player_id,g.black_player_id)));

-- Ephemeral per-user counters bound room creation / code guessing. Never public.
create table private.request_limits (user_id uuid primary key references auth.users(id) on delete cascade, window_at timestamptz not null, count integer not null);
alter table private.request_limits enable row level security;
create function private.check_rate() returns void language plpgsql security definer set search_path = '' as $$
declare hits integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into private.request_limits values(auth.uid(),now(),1)
  on conflict(user_id) do update set
    count = case when private.request_limits.window_at < now() - interval '1 minute' then 1 else private.request_limits.count + 1 end,
    window_at = case when private.request_limits.window_at < now() - interval '1 minute' then now() else private.request_limits.window_at end
  returning count into hits;
  if hits > 30 then raise exception 'RATE_LIMIT'; end if;
end $$;
revoke all on function private.check_rate() from public;

create function private.new_room_code() returns text language plpgsql volatile set search_path = '' as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text := ''; bytes bytea := decode(replace(gen_random_uuid()::text,'-',''),'hex');
begin
  for i in 0..5 loop code := code || substr(alphabet, (get_byte(bytes,i) % length(alphabet)) + 1, 1); end loop;
  return code;
end $$;
revoke all on function private.new_room_code() from public;

-- SECURITY DEFINER is necessary for narrow mutations of tables with NO client write grants.
-- Every caller-facing mutation checks auth.uid(); all have an empty search_path.
create function public.create_game(color_preference text default 'random', white_team text default 'libertadores')
returns uuid language plpgsql security definer set search_path = '' as $$
declare game_id uuid;
begin
  perform private.check_rate();
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if color_preference not in ('w','b','random') or white_team not in ('libertadores','realistas') then raise exception 'INVALID_INPUT'; end if;
  if (select count(*) from public.games where created_by = auth.uid() and status = 'waiting') >= 10 then raise exception 'RATE_LIMIT'; end if;
  for attempt in 1..20 loop
    begin
      insert into public.games(room_code,created_by,creator_color_preference,teams)
      values(private.new_room_code(),auth.uid(),color_preference,
        jsonb_build_object('w',white_team,'b',case when white_team='libertadores' then 'realistas' else 'libertadores' end))
      returning id into game_id;
      return game_id;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'RATE_LIMIT';
end $$;

create function public.join_game(code text) returns uuid language plpgsql security definer set search_path = '' as $$
declare g public.games; white_creator boolean;
begin
  perform private.check_rate();
  select * into g from public.games where room_code = upper(trim(code)) for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  -- Reopening one's room never occupies another seat.
  if auth.uid() in (g.created_by,g.white_player_id,g.black_player_id) then return g.id; end if;
  if g.status = 'active' then raise exception 'ROOM_FULL'; end if;
  if g.status <> 'waiting' then raise exception 'ROOM_CLOSED'; end if;
  white_creator := g.creator_color_preference = 'w' or (g.creator_color_preference = 'random' and random() < 0.5);
  update public.games set white_player_id = case when white_creator then g.created_by else auth.uid() end,
    black_player_id = case when white_creator then auth.uid() else g.created_by end,
    status = 'active', started_at = now(), revision = revision + 1 where id = g.id;
  return g.id;
end $$;

create function public.cancel_game(game_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.games set status = 'cancelled', revision = revision + 1
    where id = game_id and created_by = auth.uid() and status = 'waiting';
  if not found then raise exception 'ROOM_CLOSED'; end if;
end $$;

-- One SQL statement gives a consistent snapshot, including histories beyond the REST row limit.
create function public.game_snapshot(game_id uuid) returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('game',to_jsonb(g),
    'moves',coalesce((select jsonb_agg(to_jsonb(m) order by ply) from public.game_moves m where m.game_id = g.id),'[]'::jsonb),
    'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'username',p.username)) from public.profiles p
      where p.id in (g.created_by,g.white_player_id,g.black_player_id)),'[]'::jsonb))
  from public.games g where g.id = game_id;
$$;

-- The Edge Function alone can commit the output of the shared chess authority.
create function public.commit_game_action(game_id uuid, actor uuid, expected_ply integer, expected_revision integer, next_state jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare g public.games; m jsonb := next_state->'move'; has_move boolean := jsonb_typeof(m) = 'object';
begin
  select * into g from public.games where id = game_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if actor is null or (actor is distinct from g.white_player_id and actor is distinct from g.black_player_id) then raise exception 'NOT_PARTICIPANT'; end if;
  if g.status <> 'active' then raise exception 'NOT_ACTIVE'; end if;
  if g.current_ply <> expected_ply or g.revision <> expected_revision then raise exception 'STALE_STATE'; end if;
  if has_move then
    if actor <> (case g.turn when 'w' then g.white_player_id else g.black_player_id end) then raise exception 'NOT_YOUR_TURN'; end if;
    if (m->>'ply')::integer <> g.current_ply + 1 or m->>'fen_before' <> g.current_fen or (m->>'player_id')::uuid <> actor then raise exception 'STALE_STATE'; end if;
    insert into public.game_moves(game_id,ply,player_id,from_square,to_square,promotion,san,uci,fen_before,fen_after)
    values(g.id,g.current_ply + 1,actor,m->>'from_square',m->>'to_square',m->>'promotion',m->>'san',m->>'uci',m->>'fen_before',m->>'fen_after');
  end if;
  update public.games set current_fen = next_state->>'current_fen', turn = next_state->>'turn',
    current_ply = g.current_ply + case when has_move then 1 else 0 end, revision = g.revision + 1,
    result = nullif(next_state->'result','null'::jsonb), draw_offer_by = (next_state->>'draw_offer_by')::uuid,
    status = case when next_state->>'result' is null then 'active' else 'finished' end,
    finished_at = case when next_state->>'result' is null then null else now() end where id = g.id;
end $$;
revoke all on function public.commit_game_action(uuid,uuid,integer,integer,jsonb) from public, anon, authenticated;
grant execute on function public.commit_game_action(uuid,uuid,integer,integer,jsonb) to service_role;
grant all on public.games, public.game_moves, public.profiles to service_role;
grant usage, select on sequence public.game_moves_id_seq to service_role;

create function public.request_rematch(game_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare g public.games; child uuid;
begin
  perform private.check_rate();
  select * into g from public.games where id = game_id for update;
  if not found or (auth.uid() is distinct from g.white_player_id and auth.uid() is distinct from g.black_player_id) then raise exception 'NOT_FOUND'; end if;
  if g.status <> 'finished' then raise exception 'NOT_ACTIVE'; end if;
  if g.rematch_game_id is not null then return g.rematch_game_id; end if;
  if g.rematch_requested_by is null then
    update public.games set rematch_requested_by = auth.uid(), revision = revision + 1 where id = g.id;
    return null;
  end if;
  if g.rematch_requested_by = auth.uid() then return null; end if;
  for attempt in 1..20 loop
    begin
      insert into public.games(room_code,created_by,creator_color_preference,white_player_id,black_player_id,status,started_at,teams,parent_game_id)
      values(private.new_room_code(),auth.uid(),'random',g.black_player_id,g.white_player_id,'active',now(),g.teams,g.id) returning id into child;
      update public.games set rematch_game_id = child, revision = revision + 1 where id = g.id;
      return child;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'RATE_LIMIT';
end $$;

revoke all on function public.create_game(text,text), public.join_game(text), public.cancel_game(uuid), public.game_snapshot(uuid), public.request_rematch(uuid) from public, anon;
grant execute on function public.create_game(text,text), public.join_game(text), public.cancel_game(uuid), public.game_snapshot(uuid), public.request_rematch(uuid) to authenticated;

-- Private presence topics use game UUIDs and the same participant authorization.
create policy game_presence_read on realtime.messages for select to authenticated using
  (extension = 'presence' and exists(select 1 from public.games g where 'game:' || g.id::text = realtime.topic()
    and (select auth.uid()) in (g.created_by,g.white_player_id,g.black_player_id)));
create policy game_presence_write on realtime.messages for insert to authenticated with check
  (extension = 'presence' and exists(select 1 from public.games g where 'game:' || g.id::text = realtime.topic()
    and (select auth.uid()) in (g.created_by,g.white_player_id,g.black_player_id)));

-- Supabase provides this publication; local SQL tests intentionally do not.
do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.games, public.game_moves;
  end if;
end $$;
