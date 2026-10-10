-- Sync groups. Run this in the Supabase SQL editor.
-- Store only cleaned, approved post text. Never store the original wording.
-- Phone numbers stay off member lists. The app shares one parent's phone
-- only with the single helper that parent confirms.

create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  email text not null,
  phone text not null,
  created_via_code text,
  hear_help boolean not null default true,
  hear_gather boolean not null default true,
  hear_updates boolean not null default true,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  neighborhood text not null,
  -- Older databases: alter table groups drop constraint if exists groups_purpose_check;
  -- alter table groups add constraint groups_purpose_check check (char_length(trim(purpose)) > 0);
  purpose text not null check (char_length(trim(purpose)) > 0),
  creator_id uuid not null references profiles (id),
  status text not null default 'active' check (status in ('active', 'paused')),
  held boolean not null default false,
  removed boolean not null default false,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('creator', 'member')),
  trust text not null default 'everyday' check (trust in ('everyday', 'kid_trusted')),
  invited_by uuid references profiles (id),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table invite_codes (
  code text primary key,
  group_id uuid not null references groups (id) on delete cascade,
  created_by uuid not null references profiles (id),
  max_uses int not null check (max_uses > 0),
  uses int not null default 0 check (uses >= 0),
  expires_at timestamptz not null
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  author_id uuid not null references profiles (id),
  kind text not null check (kind in ('need', 'offer', 'gather', 'update')),
  topic text check (topic is null or topic in ('road_block', 'question', 'heads_up')),
  text text not null,
  expires_at timestamptz,
  held boolean not null default false,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);

create table replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references profiles (id),
  text text not null,
  held boolean not null default false,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);

create table standing_offers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  weekday text not null check (weekday in ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
  start_time text not null,
  end_time text not null,
  note text not null default ''
);

create table exchanges (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  requester_id uuid not null references profiles (id),
  helper_id uuid not null references profiles (id),
  requester_confirmed boolean not null default false,
  helper_confirmed boolean not null default false,
  chosen boolean not null default false,
  completed_at timestamptz,
  thank_you text,
  requester_recommends boolean not null default false,
  helper_recommends boolean not null default false,
  created_at timestamptz not null default now(),
  unique (post_id, helper_id)
);

create table handoffs (
  exchange_id uuid primary key references exchanges (id) on delete cascade,
  child_details text not null,
  code_word text not null,
  expires_at timestamptz
);

create table need_private (
  post_id uuid primary key references posts (id) on delete cascade,
  child_details text not null
);

create table thread_prefs (
  user_id uuid not null references profiles (id) on delete cascade,
  post_id uuid not null references posts (id) on delete cascade,
  muted boolean not null default false,
  left_thread boolean not null default false,
  primary key (user_id, post_id)
);

create table gather_rsvps (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'reply', 'group')),
  target_id uuid not null,
  reporter_id uuid references profiles (id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'restored', 'removed')),
  created_at timestamptz not null default now()
);

create table badges (
  user_id uuid not null references profiles (id) on delete cascade,
  badge text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge)
);

-- Wrong-code counts and not-yet-confirmed signups. No member policies: the server writes these.
create table code_attempts (
  subject text primary key,
  tries int not null default 0,
  updated_at timestamptz not null default now()
);

create table pending_signups (
  email text primary key,
  first_name text not null,
  phone text not null,
  invite_code text not null,
  created_at timestamptz not null default now()
);

create index group_members_user_idx on group_members (user_id);
create index posts_group_idx on posts (group_id, created_at desc);
create index exchanges_post_idx on exchanges (post_id);

create or replace function public.is_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table invite_codes enable row level security;
alter table posts enable row level security;
alter table replies enable row level security;
alter table standing_offers enable row level security;
alter table exchanges enable row level security;
alter table handoffs enable row level security;
alter table need_private enable row level security;
alter table thread_prefs enable row level security;
alter table gather_rsvps enable row level security;
alter table reports enable row level security;
alter table badges enable row level security;
alter table code_attempts enable row level security;
alter table pending_signups enable row level security;

create policy profiles_read on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from group_members me
      join group_members them on them.group_id = me.group_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );

create policy groups_read on groups for select
  using (removed = false and public.is_member(id));

create policy members_read on group_members for select
  using (public.is_member(group_id));

create policy codes_read on invite_codes for select
  using (public.is_member(group_id));

create policy posts_read on posts for select
  using (removed = false and public.is_member(group_id));

create policy replies_read on replies for select
  using (
    removed = false
    and exists (
      select 1 from posts p
      where p.id = replies.post_id and p.removed = false and public.is_member(p.group_id)
    )
  );

create policy offers_read on standing_offers for select
  using (public.is_member(group_id));

create policy exchanges_read on exchanges for select
  using (
    exists (
      select 1 from posts p
      where p.id = exchanges.post_id and public.is_member(p.group_id)
    )
  );

create policy handoffs_read on handoffs for select
  using (
    exists (
      select 1 from exchanges e
      where e.id = handoffs.exchange_id
        and e.chosen = true
        and (e.requester_id = auth.uid() or e.helper_id = auth.uid())
    )
  );

create policy need_private_read on need_private for select
  using (
    exists (
      select 1 from posts p
      where p.id = need_private.post_id and p.author_id = auth.uid()
    )
  );

create policy prefs_read on thread_prefs for select
  using (user_id = auth.uid());

create policy rsvps_read on gather_rsvps for select
  using (
    exists (
      select 1 from posts p
      where p.id = gather_rsvps.post_id and public.is_member(p.group_id)
    )
  );

create policy reports_read on reports for select
  using (reporter_id = auth.uid());

create policy badges_read on badges for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from group_members me
      join group_members them on them.group_id = me.group_id
      where me.user_id = auth.uid() and them.user_id = badges.user_id
    )
  );

-- Phone and email are not readable through the member API.
revoke all on all tables in schema public from anon, authenticated;
grant select on
  profiles, groups, group_members, invite_codes, posts, replies,
  standing_offers, exchanges, handoffs, need_private, thread_prefs,
  gather_rsvps, reports, badges
to authenticated;
revoke select (phone, email) on profiles from authenticated, anon;
