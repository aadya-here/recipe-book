import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RecipeCard } from '@/components/RecipeCard'
import { FilterBar } from '@/components/FilterBar'

const TIME_BUCKETS: { value: string; label: string; min?: number; max?: number }[] = [
  { value: 'under15', label: 'Under 15 min', max: 15 },
  { value: '15-30', label: '15–30 min', min: 15, max: 30 },
  { value: '30-60', label: '30–60 min', min: 30, max: 60 },
  { value: '60plus', label: '60+ min', min: 60 },
]

const DIET_OPTIONS = [
  { value: 'veg', label: 'Veg' },
  { value: 'egg', label: 'Egg' },
  { value: 'non-veg', label: 'Non-veg' },
  { value: 'vegan', label: 'Vegan' },
]

function toStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const rawParams = await searchParams
  const params = {
    cuisine: toStr(rawParams.cuisine),
    time: toStr(rawParams.time),
    meal: toStr(rawParams.meal),
    diet: toStr(rawParams.diet),
    q: toStr(rawParams.q),
    match: toStr(rawParams.match) === 'all' ? 'all' : 'any',
  }

  const supabase = await createClient()

  const [{ data: cuisines }, { data: mealTypes }] = await Promise.all([
    supabase.from('cuisines').select('id, name, slug').order('name'),
    supabase.from('meal_types').select('id, name, slug').order('name'),
  ])

  let query = supabase
    .from('recipes')
    .select(
      `
      id, slug, title, diet_type, total_time_minutes, prep_time_minutes, cook_time_minutes, servings,
      cuisines ( name ),
      recipe_photos ( url, is_primary )
    `
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (params.cuisine) {
    const cuisine = cuisines?.find((c) => c.slug === params.cuisine)
    query = query.eq('cuisine_id', cuisine?.id ?? EMPTY_UUID)
  }

  if (params.diet) {
    query = query.eq('diet_type', params.diet)
  }

  if (params.time) {
    const bucket = TIME_BUCKETS.find((t) => t.value === params.time)
    if (bucket?.min !== undefined) query = query.gte('total_time_minutes', bucket.min)
    if (bucket?.max !== undefined) query = query.lt('total_time_minutes', bucket.max)
  }

  if (params.meal) {
    const mealType = mealTypes?.find((m) => m.slug === params.meal)
    const { data: mealRecipeIds } = await supabase
      .from('recipe_meal_types')
      .select('recipe_id')
      .eq('meal_type_id', mealType?.id ?? EMPTY_UUID)
    const ids = (mealRecipeIds ?? []).map((r) => r.recipe_id)
    query = query.in('id', ids.length > 0 ? ids : [EMPTY_UUID])
  }

  if (params.q) {
    const terms = params.q
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const perTermRecipeIds: string[][] = []
    for (const term of terms) {
      const { data: matchingIngredients } = await supabase
        .from('ingredients')
        .select('id')
        .ilike('name', `%${term}%`)
      const ingredientIds = (matchingIngredients ?? []).map((i) => i.id)

      if (ingredientIds.length === 0) {
        perTermRecipeIds.push([])
        continue
      }

      const { data: matchingRecipeIngredients } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id')
        .in('ingredient_id', ingredientIds)
      perTermRecipeIds.push([...new Set((matchingRecipeIngredients ?? []).map((r) => r.recipe_id))])
    }

    const ids =
      perTermRecipeIds.length === 0
        ? []
        : params.match === 'all'
          ? perTermRecipeIds.reduce((acc, curr) => acc.filter((id) => curr.includes(id)))
          : [...new Set(perTermRecipeIds.flat())]

    query = query.in('id', ids.length > 0 ? ids : [EMPTY_UUID])
  }

  const { data: recipes } = await query

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recipes</h1>
        <Button size="sm" render={<Link href="/submit" />}>
          Submit a recipe
        </Button>
      </div>

      <Suspense>
        <FilterBar
          cuisines={(cuisines ?? []).map((c) => ({ value: c.slug, label: c.name }))}
          mealTypes={(mealTypes ?? []).map((m) => ({ value: m.slug, label: m.name }))}
          timeBuckets={TIME_BUCKETS}
          dietOptions={DIET_OPTIONS}
        />
      </Suspense>

      {!recipes || recipes.length === 0 ? (
        <p className="text-muted-foreground">No recipes match these filters yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe, i) => (
            <RecipeCard key={recipe.id} recipe={recipe} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
