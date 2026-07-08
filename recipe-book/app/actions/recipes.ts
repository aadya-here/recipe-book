'use server'
import { createClient, requireUser } from '@/utils/supabase/server'
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

export async function getRandomRecipeSlug(source: 'all' | 'favorites'): Promise<string | null> {
  const supabase = await createClient()

  if (source === 'favorites') {
    const user = await requireUser(supabase)
    const { data } = await supabase
      .from('favorites')
      .select('recipes ( slug )')
      .eq('user_id', user.id)
    const slugs = (data ?? []).flatMap((f) => f.recipes ?? []).map((r) => r.slug)
    if (slugs.length === 0) return null
    return slugs[Math.floor(Math.random() * slugs.length)]
  }

  const { data } = await supabase.from('recipes').select('slug').eq('status', 'published')
  if (!data || data.length === 0) return null
  return data[Math.floor(Math.random() * data.length)].slug
}

export async function createRecipe(values: RecipeFormValues, photo: File | null, publish: boolean) {
  const parsed = recipeSchema.parse(values)

  const supabase = await createClient()
  const user = await requireUser(supabase)

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
      // servings: parsed.servings ?? null, // servings column was dropped — no longer inserted
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

  const { data: allIngredients } = await supabase.from('ingredients').select('id, name')
  const ingredientIdByLowerName = new Map(
    (allIngredients ?? []).map((ing) => [ing.name.toLowerCase(), ing.id])
  )

  const missingNames = [
    ...new Set(
      parsed.ingredients
        .map((row) => row.ingredientName)
        .filter((name) => !ingredientIdByLowerName.has(name.toLowerCase()))
    ),
  ]

  if (missingNames.length > 0) {
    const { data: created, error: ingredientError } = await supabase
      .from('ingredients')
      .insert(missingNames.map((name) => ({ name })))
      .select('id, name')
    if (ingredientError || !created) throw new Error('Failed to save ingredient')
    for (const ing of created) ingredientIdByLowerName.set(ing.name.toLowerCase(), ing.id)
  }

  await supabase.from('recipe_ingredients').insert(
    parsed.ingredients.map((row, i) => ({
      recipe_id: recipe.id,
      ingredient_id: ingredientIdByLowerName.get(row.ingredientName.toLowerCase()),
      quantity: row.quantity ?? null,
      unit: row.unit || null,
      note: row.note || null,
      position: i,
    }))
  )

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
