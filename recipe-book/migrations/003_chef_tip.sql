-- Run in the Supabase SQL editor. Adds an optional chef's tip to recipes,
-- shown publicly on the recipe page alongside the rest of its content.
alter table recipes add column if not exists chef_tip text;
