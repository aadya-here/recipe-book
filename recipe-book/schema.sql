-- Recipe Book schema
-- Run this in the Supabase SQL editor (or via `supabase db push` if you
-- later move to CLI migrations). Order matters: helper functions before
-- policies that call them, parent tables before child FKs.

-- =========================================================================
-- 0. Extensions
-- =========================================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- =========================================================================
-- 1. profiles
-- =========================================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'New cook',
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'trusted', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New cook'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent users from promoting themselves via a plain profile update.
create function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on profiles
  for each row execute function public.prevent_role_escalation();

-- =========================================================================
-- 2. Role helper functions (security definer avoids RLS recursion)
-- =========================================================================
create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create function public.is_trusted_or_above()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('trusted', 'admin')
  );
$$;

-- =========================================================================
-- 3. Taxonomy tables
-- =========================================================================
create table cuisines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table meal_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- =========================================================================
-- 4. recipes
-- =========================================================================
create table recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  author_id uuid not null references profiles (id),
  cuisine_id uuid references cuisines (id),
  diet_type text not null check (diet_type in ('veg', 'egg', 'non-veg', 'vegan')),
  prep_time_minutes int,
  cook_time_minutes int,
  total_time_minutes int generated always as (
    coalesce(prep_time_minutes, 0) + coalesce(cook_time_minutes, 0)
  ) stored,
  servings int,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'archived')),
  -- Every recipe defaults to its own fresh group, so a solo recipe needs
  -- no null-handling; it only shares a group once a variant is linked.
  variant_group_id uuid not null default gen_random_uuid(),
  variant_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_variant_group_idx on recipes (variant_group_id);
create index recipes_status_idx on recipes (status);
create index recipes_cuisine_idx on recipes (cuisine_id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_set_updated_at
  before update on recipes
  for each row execute function public.set_updated_at();

-- Force status based on role at insert time (client-sent status is ignored).
create function public.set_recipe_initial_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'draft' then
    return new; -- explicit draft save is always allowed
  end if;

  if public.is_trusted_or_above() then
    new.status = 'published';
  else
    new.status = 'pending_review';
  end if;

  return new;
end;
$$;

create trigger recipes_set_initial_status
  before insert on recipes
  for each row execute function public.set_recipe_initial_status();

-- Only admins may change status on an existing recipe (approve/reject/archive).
-- Authors can still update everything else about their own recipe.
create function public.guard_recipe_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then
    raise exception 'Only admins can change recipe status';
  end if;
  return new;
end;
$$;

create trigger recipes_guard_status_change
  before update on recipes
  for each row execute function public.guard_recipe_status_change();

-- =========================================================================
-- 5. Child tables
-- =========================================================================
create table recipe_meal_types (
  recipe_id uuid not null references recipes (id) on delete cascade,
  meal_type_id uuid not null references meal_types (id) on delete cascade,
  primary key (recipe_id, meal_type_id)
);

create table recipe_tags (
  recipe_id uuid not null references recipes (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id) on delete cascade,
  ingredient_id uuid not null references ingredients (id),
  quantity numeric,
  unit text,
  note text,
  position int not null default 0
);

create index recipe_ingredients_recipe_idx on recipe_ingredients (recipe_id);

create table recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id) on delete cascade,
  step_number int not null,
  instruction text not null,
  timer_seconds int,
  unique (recipe_id, step_number)
);

create table recipe_photos (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id) on delete cascade,
  url text not null,
  is_primary boolean not null default false,
  position int not null default 0
);

-- =========================================================================
-- 6. Engagement tables
-- =========================================================================
create table favorites (
  user_id uuid not null references profiles (id) on delete cascade,
  recipe_id uuid not null references recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table ratings (
  user_id uuid not null references profiles (id) on delete cascade,
  recipe_id uuid not null references recipes (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create trigger ratings_set_updated_at
  before update on ratings
  for each row execute function public.set_updated_at();

create table comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  recipe_id uuid not null references recipes (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger comments_set_updated_at
  before update on comments
  for each row execute function public.set_updated_at();

-- =========================================================================
-- 7. Row Level Security
-- =========================================================================
alter table profiles enable row level security;
alter table cuisines enable row level security;
alter table meal_types enable row level security;
alter table tags enable row level security;
alter table ingredients enable row level security;
alter table recipes enable row level security;
alter table recipe_meal_types enable row level security;
alter table recipe_tags enable row level security;
alter table recipe_ingredients enable row level security;
alter table recipe_steps enable row level security;
alter table recipe_photos enable row level security;
alter table favorites enable row level security;
alter table ratings enable row level security;
alter table comments enable row level security;

-- ---- profiles ----
create policy "profiles are publicly readable"
  on profiles for select
  using (true);

create policy "users update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
-- role escalation on this path is blocked by the profiles_prevent_role_escalation trigger

-- ---- taxonomy: public read, admin write ----
create policy "cuisines are publicly readable"
  on cuisines for select using (true);
create policy "admins manage cuisines"
  on cuisines for all using (public.is_admin()) with check (public.is_admin());

create policy "meal_types are publicly readable"
  on meal_types for select using (true);
create policy "admins manage meal_types"
  on meal_types for all using (public.is_admin()) with check (public.is_admin());

create policy "tags are publicly readable"
  on tags for select using (true);
create policy "admins manage tags"
  on tags for all using (public.is_admin()) with check (public.is_admin());

create policy "ingredients are publicly readable"
  on ingredients for select using (true);
create policy "authenticated users add ingredients"
  on ingredients for insert
  with check (auth.role() = 'authenticated');
create policy "admins manage ingredients"
  on ingredients for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete ingredients"
  on ingredients for delete using (public.is_admin());

-- ---- recipes ----
create policy "published recipes are publicly readable"
  on recipes for select
  using (
    status = 'published'
    or author_id = auth.uid()
    or public.is_admin()
  );

create policy "authenticated users submit recipes"
  on recipes for insert
  with check (auth.uid() = author_id);

create policy "authors and admins update recipes"
  on recipes for update
  using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());
-- status-change restriction is enforced by the recipes_guard_status_change trigger

-- No delete policy: archiving (status = 'archived') is the only removal path.

-- ---- recipe child tables: visibility follows the parent recipe ----
create policy "recipe_meal_types follow parent visibility"
  on recipe_meal_types for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id
        and (r.status = 'published' or r.author_id = auth.uid() or public.is_admin())
    )
  );
create policy "authors manage own recipe_meal_types"
  on recipe_meal_types for all
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  );

create policy "recipe_tags follow parent visibility"
  on recipe_tags for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id
        and (r.status = 'published' or r.author_id = auth.uid() or public.is_admin())
    )
  );
create policy "authors manage own recipe_tags"
  on recipe_tags for all
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  );

create policy "recipe_ingredients follow parent visibility"
  on recipe_ingredients for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id
        and (r.status = 'published' or r.author_id = auth.uid() or public.is_admin())
    )
  );
create policy "authors manage own recipe_ingredients"
  on recipe_ingredients for all
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  );

create policy "recipe_steps follow parent visibility"
  on recipe_steps for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id
        and (r.status = 'published' or r.author_id = auth.uid() or public.is_admin())
    )
  );
create policy "authors manage own recipe_steps"
  on recipe_steps for all
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  );

create policy "recipe_photos follow parent visibility"
  on recipe_photos for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id
        and (r.status = 'published' or r.author_id = auth.uid() or public.is_admin())
    )
  );
create policy "authors manage own recipe_photos"
  on recipe_photos for all
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and (r.author_id = auth.uid() or public.is_admin())
    )
  );

-- ---- favorites: private to each user ----
create policy "users manage own favorites"
  on favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- ratings: public read (for averages), write own only ----
create policy "ratings are publicly readable"
  on ratings for select using (true);
create policy "users manage own ratings"
  on ratings for insert with check (auth.uid() = user_id);
create policy "users update own ratings"
  on ratings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own ratings"
  on ratings for delete using (auth.uid() = user_id);

-- ---- comments: public read, write own only (visible to all per PRD default) ----
create policy "comments are publicly readable"
  on comments for select using (true);
create policy "authenticated users add comments"
  on comments for insert with check (auth.uid() = user_id);
create policy "users edit own comments"
  on comments for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());
create policy "users delete own comments"
  on comments for delete using (auth.uid() = user_id or public.is_admin());

-- =========================================================================
-- 8. Storage: recipe-photos bucket
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

create policy "recipe photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'recipe-photos');

-- Users may only write into a folder prefixed with their own user id,
-- e.g. recipe-photos/<user_id>/some-file.jpg
create policy "users upload to own recipe-photos folder"
  on storage.objects for insert
  with check (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users manage own recipe-photos folder"
  on storage.objects for update
  using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own recipe-photos folder"
  on storage.objects for delete
  using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =========================================================================
-- 9. Seed data (enough for filters to not be empty on first run)
-- =========================================================================
insert into cuisines (name, slug) values
  ('Indian', 'indian'),
  ('Italian', 'italian'),
  ('Pan-Asian', 'pan-asian'),
  ('Mexican', 'mexican'),
  ('Mediterranean', 'mediterranean')
on conflict (name) do nothing;

insert into meal_types (name, slug) values
  ('Breakfast', 'breakfast'),
  ('Snack', 'snack'),
  ('Lunch', 'lunch'),
  ('Dinner', 'dinner'),
  ('Dessert', 'dessert'),
  ('Drink', 'drink')
on conflict (name) do nothing;
