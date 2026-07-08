'use server'
import { createClient } from '@/utils/supabase/server'
import { recipeSchema, type RecipeFormValues } from '@/lib/schemas/recipe'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function createRecipe(values: RecipeFormValues, photo: File | null, publish: boolean) {
  const parsed = recipeSchema.parse(values)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be signed in')

  const slug = `${slugify(parsed.title)}-${crypto.randomUUID().slice(0, 6)}`

  // Status sent here is only a hint: the DB trigger (set_recipe_initial_status)
  // forces pending_review vs published based on the submitter's role, and
  // always honors an explicit 'draft'.
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      slug,
      title: parsed.title,
      description: parsed.description || null,
      author_id: user.id,
      cuisine_id: parsed.cuisineId || null,
      diet_type: parsed.dietType,
      prep_time_minutes: parsed.prepTimeMinutes ?? null,
      cook_time_minutes: parsed.cookTimeMinutes ?? null,
      servings: parsed.servings ?? null,
      status: publish ? 'published' : 'draft',
    })
    .select('id, slug')
    .single()

  if (recipeError || !recipe) {
    throw new Error(recipeError?.message ?? 'Failed to create recipe')
  }

  if (parsed.mealTypeIds.length > 0) {
    await supabase.from('recipe_meal_types').insert(
      parsed.mealTypeIds.map((meal_type_id) => ({ recipe_id: recipe.id, meal_type_id }))
    )
  }

  for (let i = 0; i < parsed.ingredients.length; i++) {
    const row = parsed.ingredients[i]

    const { data: existing } = await supabase
      .from('ingredients')
      .select('id')
      .ilike('name', row.ingredientName)
      .maybeSingle()

    let ingredientId = existing?.id as string | undefined

    if (!ingredientId) {
      const { data: created, error: ingredientError } = await supabase
        .from('ingredients')
        .insert({ name: row.ingredientName })
        .select('id')
        .single()
      if (ingredientError || !created) throw new Error('Failed to save ingredient')
      ingredientId = created.id
    }

    await supabase.from('recipe_ingredients').insert({
      recipe_id: recipe.id,
      ingredient_id: ingredientId,
      quantity: row.quantity ?? null,
      unit: row.unit || null,
      note: row.note || null,
      position: i,
    })
  }

  await supabase.from('recipe_steps').insert(
    parsed.steps.map((step, i) => ({
      recipe_id: recipe.id,
      step_number: i + 1,
      instruction: step.instruction,
      timer_seconds: step.timerSeconds ?? null,
    }))
  )

  if (photo && photo.size > 0) {
    const path = `${user.id}/${crypto.randomUUID()}-${photo.name}`
    const { error: uploadError } = await supabase.storage.from('recipe-photos').upload(path, photo)

    if (!uploadError) {
      const { data: publicUrl } = supabase.storage.from('recipe-photos').getPublicUrl(path)
      await supabase.from('recipe_photos').insert({
        recipe_id: recipe.id,
        url: publicUrl.publicUrl,
        is_primary: true,
        position: 0,
      })
    }
  }

  revalidatePath('/')
  redirect(`/r/${recipe.slug}`)
}
