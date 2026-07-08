-- Run in the Supabase SQL editor. Makes comments private notes
-- (only the author, or an admin, can read their own comments) instead
-- of the original "visible to everyone" default.
drop policy if exists "comments are publicly readable" on comments;

create policy "users read own comments"
  on comments for select using (auth.uid() = user_id or public.is_admin());
