import { createClient, requireUserOrRedirect } from '@/utils/supabase/server'
import { RecipeCard } from '@/components/RecipeCard'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const user = await requireUserOrRedirect(supabase, '/login?next=/favorites')

  // servings column was dropped — no longer selected
  const { data: favorites } = await supabase
    .from('favorites')
    .select(
      `
      recipe_id,
      recipes (
        id, slug, title, diet_type, prep_time_minutes, cook_time_minutes,
        cuisines ( name ),
        recipe_photos ( url, is_primary )
      )
    `
    )
    .eq('user_id', user.id)

  const recipes = (favorites ?? []).flatMap((f) => f.recipes ?? [])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">Your favorites</h1>

      {recipes.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing saved yet — tap the heart on a recipe to keep it here.
        </p>
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
