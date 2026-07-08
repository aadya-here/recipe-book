-- Run in the Supabase SQL editor. Seeds 8 sample recipes spanning every
-- diet type, most cuisines/meal types, and all four time buckets, so the
-- homepage filters and recipe cards have real data to test against.
-- Uses the first profile it finds as the author -- sign up in the app at
-- least once before running this.
--
-- Recipes has triggers that force `status` based on auth.uid(), which is
-- NULL in a raw SQL editor session (no logged-in request). They're
-- disabled here for the seed only, then re-enabled immediately after.
--
-- To re-run this from scratch, first delete the old seed data:
--   delete from recipes where slug like '%-seed1';

create or replace function pg_temp.get_or_create_ingredient(p_name text) returns uuid as $$
declare
  v_id uuid;
begin
  select id into v_id from ingredients where name = p_name;
  if v_id is null then
    insert into ingredients (name) values (p_name) returning id into v_id;
  end if;
  return v_id;
end;
$$ language plpgsql;

do $$
declare
  v_author_id uuid;
  v_recipe_id uuid;
  v_cuisine_id uuid;
  v_meal_type_id uuid;
begin
  select id into v_author_id from profiles order by created_at limit 1;
  if v_author_id is null then
    raise exception 'No profiles found -- sign up in the app at least once before seeding recipes';
  end if;

  alter table recipes disable trigger recipes_set_initial_status;
  alter table recipes disable trigger recipes_guard_status_change;

  -- 1. Masala Chai -- Indian, vegan, drink, under 15 min
  select id into v_cuisine_id from cuisines where slug = 'indian';
  insert into recipes (slug, title, description, author_id, cuisine_id, diet_type, prep_time_minutes, cook_time_minutes, servings, status)
  values ('masala-chai-seed1', 'Masala Chai', 'Spiced Indian tea.', v_author_id, v_cuisine_id, 'vegan', 5, 5, 2, 'published')
  returning id into v_recipe_id;

  select id into v_meal_type_id from meal_types where slug = 'drink';
  insert into recipe_meal_types (recipe_id, meal_type_id) values (v_recipe_id, v_meal_type_id);

  insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position) values
    (v_recipe_id, pg_temp.get_or_create_ingredient('Tea leaves'), 2, 'tsp', 0),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Milk'), 1, 'cup', 1),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Ginger'), 1, 'inch', 2),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Sugar'), 2, 'tsp', 3);

  insert into recipe_steps (recipe_id, step_number, instruction, timer_seconds) values
    (v_recipe_id, 1, 'Boil water with tea leaves and ginger.', 180),
    (v_recipe_id, 2, 'Add milk and sugar, simmer until fragrant.', 120);

  insert into recipe_photos (recipe_id, url, is_primary, position) values
    (v_recipe_id, 'https://picsum.photos/seed/masala-chai/800/450', true, 0);

  -- 2. Aglio e Olio -- Italian, veg, dinner, 15-30 min
  select id into v_cuisine_id from cuisines where slug = 'italian';
  insert into recipes (slug, title, description, author_id, cuisine_id, diet_type, prep_time_minutes, cook_time_minutes, servings, status)
  values ('aglio-e-olio-seed1', 'Aglio e Olio', 'Simple garlic and olive oil pasta.', v_author_id, v_cuisine_id, 'veg', 10, 10, 2, 'published')
  returning id into v_recipe_id;

  select id into v_meal_type_id from meal_types where slug = 'dinner';
  insert into recipe_meal_types (recipe_id, meal_type_id) values (v_recipe_id, v_meal_type_id);

  insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position) values
    (v_recipe_id, pg_temp.get_or_create_ingredient('Spaghetti'), 200, 'g', 0),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Garlic'), 4, 'cloves', 1),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Olive oil'), 3, 'tbsp', 2),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Chili flakes'), 1, 'tsp', 3);

  insert into recipe_steps (recipe_id, step_number, instruction, timer_seconds) values
    (v_recipe_id, 1, 'Boil spaghetti until al dente.', 600),
    (v_recipe_id, 2, 'Saute garlic and chili flakes in olive oil, toss with pasta.', 300);

  insert into recipe_photos (recipe_id, url, is_primary, position) values
    (v_recipe_id, 'https://picsum.photos/seed/aglio-e-olio/800/450', true, 0);

  -- 3. Egg Fried Rice -- Pan-Asian, egg, lunch, 30-60 min
  select id into v_cuisine_id from cuisines where slug = 'pan-asian';
  insert into recipes (slug, title, description, author_id, cuisine_id, diet_type, prep_time_minutes, cook_time_minutes, servings, status)
  values ('egg-fried-rice-seed1', 'Egg Fried Rice', 'Quick weeknight fried rice.', v_author_id, v_cuisine_id, 'egg', 15, 20, 2, 'published')
  returning id into v_recipe_id;

  select id into v_meal_type_id from meal_types where slug = 'lunch';
  insert into recipe_meal_types (recipe_id, meal_type_id) values (v_recipe_id, v_meal_type_id);

  insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position) values
    (v_recipe_id, pg_temp.get_or_create_ingredient('Rice'), 2, 'cups', 0),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Egg'), 2, 'whole', 1),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Garlic'), 2, 'cloves', 2),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Soy sauce'), 2, 'tbsp', 3);

  insert into recipe_steps (recipe_id, step_number, instruction, timer_seconds) values
    (v_recipe_id, 1, 'Scramble eggs, set aside.', 180),
    (v_recipe_id, 2, 'Stir-fry rice with garlic and soy sauce, fold in eggs.', 420);

  insert into recipe_photos (recipe_id, url, is_primary, position) values
    (v_recipe_id, 'https://picsum.photos/seed/egg-fried-rice/800/450', true, 0);

  -- 4. Butter Chicken -- Indian, non-veg, dinner, 60+ min
  select id into v_cuisine_id from cuisines where slug = 'indian';
  insert into recipes (slug, title, description, author_id, cuisine_id, diet_type, prep_time_minutes, cook_time_minutes, servings, status)
  values ('butter-chicken-seed1', 'Butter Chicken', 'Rich tomato and butter curry.', v_author_id, v_cuisine_id, 'non-veg', 20, 40, 4, 'published')
  returning id into v_recipe_id;

  select id into v_meal_type_id from meal_types where slug = 'dinner';
  insert into recipe_meal_types (recipe_id, meal_type_id) values (v_recipe_id, v_meal_type_id);

  insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position) values
    (v_recipe_id, pg_temp.get_or_create_ingredient('Chicken'), 500, 'g', 0),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Butter'), 3, 'tbsp', 1),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Tomato'), 4, 'whole', 2),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Garlic'), 3, 'cloves', 3);

  insert into recipe_steps (recipe_id, step_number, instruction, timer_seconds) values
    (v_recipe_id, 1, 'Marinate and grill chicken.', 1200),
    (v_recipe_id, 2, 'Simmer tomato-butter gravy, add chicken.', 1200);

  insert into recipe_photos (recipe_id, url, is_primary, position) values
    (v_recipe_id, 'https://picsum.photos/seed/butter-chicken/800/450', true, 0);

  -- 5. Chilaquiles -- Mexican, egg, breakfast, 15-30 min
  select id into v_cuisine_id from cuisines where slug = 'mexican';
  insert into recipes (slug, title, description, author_id, cuisine_id, diet_type, prep_time_minutes, cook_time_minutes, servings, status)
  values ('chilaquiles-seed1', 'Chilaquiles', 'Crispy tortilla chips in salsa with egg.', v_author_id, v_cuisine_id, 'egg', 10, 10, 2, 'published')
  returning id into v_recipe_id;

  select id into v_meal_type_id from meal_types where slug = 'breakfast';
  insert into recipe_meal_types (recipe_id, meal_type_id) values (v_recipe_id, v_meal_type_id);

  insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position) values
    (v_recipe_id, pg_temp.get_or_create_ingredient('Tortilla chips'), 2, 'cups', 0),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Egg'), 2, 'whole', 1),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Salsa'), 1, 'cup', 2),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Cheese'), 0.5, 'cup', 3);

  insert into recipe_steps (recipe_id, step_number, instruction, timer_seconds) values
    (v_recipe_id, 1, 'Simmer tortilla chips in salsa.', 300),
    (v_recipe_id, 2, 'Top with fried eggs and cheese.', 300);

  insert into recipe_photos (recipe_id, url, is_primary, position) values
    (v_recipe_id, 'https://picsum.photos/seed/chilaquiles/800/450', true, 0);

  -- 6. Greek Salad -- Mediterranean, vegan, lunch, 15-30 min (boundary: total = 15)
  select id into v_cuisine_id from cuisines where slug = 'mediterranean';
  insert into recipes (slug, title, description, author_id, cuisine_id, diet_type, prep_time_minutes, cook_time_minutes, servings, status)
  values ('greek-salad-seed1', 'Greek Salad', 'No-cook cucumber and tomato salad.', v_author_id, v_cuisine_id, 'vegan', 15, 0, 2, 'published')
  returning id into v_recipe_id;

  select id into v_meal_type_id from meal_types where slug = 'lunch';
  insert into recipe_meal_types (recipe_id, meal_type_id) values (v_recipe_id, v_meal_type_id);

  insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position) values
    (v_recipe_id, pg_temp.get_or_create_ingredient('Cucumber'), 1, 'whole', 0),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Tomato'), 2, 'whole', 1),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Olives'), 0.25, 'cup', 2),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Feta'), 0.5, 'cup', 3);

  insert into recipe_steps (recipe_id, step_number, instruction, timer_seconds) values
    (v_recipe_id, 1, 'Chop vegetables.', null),
    (v_recipe_id, 2, 'Toss with olives, feta, and olive oil.', null);

  insert into recipe_photos (recipe_id, url, is_primary, position) values
    (v_recipe_id, 'https://picsum.photos/seed/greek-salad/800/450', true, 0);

  -- 7. Chocolate Mug Cake -- veg, dessert, under 15 min, no cuisine
  insert into recipes (slug, title, description, author_id, cuisine_id, diet_type, prep_time_minutes, cook_time_minutes, servings, status)
  values ('mug-cake-seed1', 'Chocolate Mug Cake', 'One-bowl microwave dessert.', v_author_id, null, 'veg', 5, 2, 1, 'published')
  returning id into v_recipe_id;

  select id into v_meal_type_id from meal_types where slug = 'dessert';
  insert into recipe_meal_types (recipe_id, meal_type_id) values (v_recipe_id, v_meal_type_id);

  insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position) values
    (v_recipe_id, pg_temp.get_or_create_ingredient('Flour'), 4, 'tbsp', 0),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Cocoa powder'), 2, 'tbsp', 1),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Sugar'), 3, 'tbsp', 2),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Milk'), 3, 'tbsp', 3);

  insert into recipe_steps (recipe_id, step_number, instruction, timer_seconds) values
    (v_recipe_id, 1, 'Mix all ingredients in a mug.', null),
    (v_recipe_id, 2, 'Microwave for 90 seconds.', 90);

  insert into recipe_photos (recipe_id, url, is_primary, position) values
    (v_recipe_id, 'https://picsum.photos/seed/mug-cake/800/450', true, 0);

  -- 8. Sev Puri -- Indian, veg, snack, 15-30 min (boundary: total = 15)
  select id into v_cuisine_id from cuisines where slug = 'indian';
  insert into recipes (slug, title, description, author_id, cuisine_id, diet_type, prep_time_minutes, cook_time_minutes, servings, status)
  values ('sev-puri-seed1', 'Sev Puri', 'Crunchy Mumbai street-food snack.', v_author_id, v_cuisine_id, 'veg', 15, 0, 2, 'published')
  returning id into v_recipe_id;

  select id into v_meal_type_id from meal_types where slug = 'snack';
  insert into recipe_meal_types (recipe_id, meal_type_id) values (v_recipe_id, v_meal_type_id);

  insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position) values
    (v_recipe_id, pg_temp.get_or_create_ingredient('Sev'), 1, 'cup', 0),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Potato'), 2, 'whole', 1),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Tamarind chutney'), 3, 'tbsp', 2),
    (v_recipe_id, pg_temp.get_or_create_ingredient('Onion'), 1, 'whole', 3);

  insert into recipe_steps (recipe_id, step_number, instruction, timer_seconds) values
    (v_recipe_id, 1, 'Boil and dice potatoes.', 600),
    (v_recipe_id, 2, 'Assemble puris with potato, chutney, onion, and sev.', null);

  insert into recipe_photos (recipe_id, url, is_primary, position) values
    (v_recipe_id, 'https://picsum.photos/seed/sev-puri/800/450', true, 0);

  alter table recipes enable trigger recipes_set_initial_status;
  alter table recipes enable trigger recipes_guard_status_change;
end $$;
