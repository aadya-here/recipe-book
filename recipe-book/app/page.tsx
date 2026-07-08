import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import { RecipeCard } from '@/components/RecipeCard'
import { FilterBar } from '@/components/FilterBar'
import { ShuffleButton } from '@/components/ShuffleButton'
import { DIET_OPTIONS } from '@/lib/constants'

type Supabase = Awaited<ReturnType<typeof createClient>>
type SlugRow = { id: string; slug: string }

const TIME_BUCKETS: { value: string; label: string; min?: number; max?: number }[] = [
  { value: 'under15', label: 'Under 15 min', max: 15 },
  { value: '15-30', label: '15–30 min', min: 15, max: 30 },
  { value: '30-60', label: '30–60 min', min: 30, max: 60 },
  { value: '60plus', label: '60+ min', min: 60 },
]

function toStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

// Returns null when the filter isn't active, or the matching recipe ids
// (possibly empty) when it is — an empty array means "no recipes match".
async function resolveMealFilter(
  supabase: Supabase,
  mealTypes: SlugRow[] | null,
  mealSlug: string | undefined
): Promise<string[] | null> {
  if (!mealSlug) return null
  const mealType = mealTypes?.find((m) => m.slug === mealSlug)
  if (!mealType) return []

  const { data } = await supabase
    .from('recipe_meal_types')
    .select('recipe_id')
    .eq('meal_type_id', mealType.id)
  return [...new Set((data ?? []).map((r) => r.recipe_id))]
}

async function resolveIngredientSearch(
  supabase: Supabase,
  q: string | undefined,
  match: 'any' | 'all'
): Promise<string[] | null> {
  if (!q) return null
  const terms = q
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  if (terms.length === 0) return null

  const { data: allIngredients } = await supabase.from('ingredients').select('id, name')

  const perTermIngredientIds = terms.map((term) => {
    const needle = term.toLowerCase()
    return (allIngredients ?? [])
      .filter((ing) => ing.name.toLowerCase().includes(needle))
      .map((ing) => ing.id)
  })

  const allIngredientIds = [...new Set(perTermIngredientIds.flat())]
  if (allIngredientIds.length === 0) return []

  const { data: matchingRecipeIngredients } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id')
    .in('ingredient_id', allIngredientIds)

  const perTermRecipeIds = perTermIngredientIds.map((ingredientIds) => {
    const idSet = new Set(ingredientIds)
    return [
      ...new Set(
        (matchingRecipeIngredients ?? [])
          .filter((ri) => idSet.has(ri.ingredient_id))
          .map((ri) => ri.recipe_id)
      ),
    ]
  })

  return match === 'all'
    ? perTermRecipeIds.reduce((acc, curr) => acc.filter((id) => curr.includes(id)))
    : [...new Set(perTermRecipeIds.flat())]
}

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
    match: (toStr(rawParams.match) === 'all' ? 'all' : 'any') as 'any' | 'all',
  }

  const supabase = await createClient()

  const [{ data: cuisines }, { data: mealTypes }, { data: { user } }] = await Promise.all([
    supabase.from('cuisines').select('id, name, slug').order('name'),
    supabase.from('meal_types').select('id, name, slug').order('name'),
    supabase.auth.getUser(),
  ])

  // servings column was dropped — no longer selected
  let query = supabase
    .from('recipes')
    .select(
      `
      id, slug, title, diet_type, total_time_minutes, prep_time_minutes, cook_time_minutes,
      cuisines ( name ),
      recipe_photos ( url, is_primary )
    `
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  let noResults = false

  if (params.cuisine) {
    const cuisine = cuisines?.find((c) => c.slug === params.cuisine)
    if (!cuisine) noResults = true
    else query = query.eq('cuisine_id', cuisine.id)
  }

  if (params.diet) {
    query = query.eq('diet_type', params.diet)
  }

  if (params.time) {
    const bucket = TIME_BUCKETS.find((t) => t.value === params.time)
    if (bucket?.min !== undefined) query = query.gte('total_time_minutes', bucket.min)
    if (bucket?.max !== undefined) query = query.lt('total_time_minutes', bucket.max)
  }

  const [mealIds, searchIds] = await Promise.all([
    resolveMealFilter(supabase, mealTypes, params.meal),
    resolveIngredientSearch(supabase, params.q, params.match),
  ])

  if (mealIds) {
    if (mealIds.length === 0) noResults = true
    else query = query.in('id', mealIds)
  }

  if (searchIds) {
    if (searchIds.length === 0) noResults = true
    else query = query.in('id', searchIds)
  }

  const recipes = noResults ? [] : (await query).data

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recipes for Single Servings</h1>
        {/* <Button size="sm" render={<Link href="/submit" />}>
          Submit a recipe
        </Button> */}
        <ShuffleButton isLoggedIn={Boolean(user)} />
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
