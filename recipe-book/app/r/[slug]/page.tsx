import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { FavoriteButton } from '@/components/FavoriteButton'
import { CommentsSection } from '@/components/CommentsSection'

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // servings column was dropped — no longer selected
  const { data: recipe } = await supabase
    .from('recipes')
    .select(
      `
      id, slug, title, description, diet_type, prep_time_minutes, cook_time_minutes,
      total_time_minutes, status,
      cuisines ( name ),
      recipe_meal_types ( meal_types ( name ) ),
      recipe_ingredients ( id, quantity, unit, note, position, ingredients ( name ) ),
      recipe_steps ( id, step_number, instruction, timer_seconds ),
      recipe_photos ( id, url, is_primary )
    `
    )
    .eq('slug', slug)
    .maybeSingle()

  if (!recipe) {
    notFound()
  }

  let isFavorited = false
  let comments: { id: string; body: string; created_at: string }[] = []

  if (user) {
    const [{ data: favorite }, { data: ownComments }] = await Promise.all([
      supabase
        .from('favorites')
        .select('recipe_id')
        .eq('recipe_id', recipe.id)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('comments')
        .select('id, body, created_at')
        .eq('recipe_id', recipe.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])
    isFavorited = Boolean(favorite)
    comments = ownComments ?? []
  }

  const ingredients = [...recipe.recipe_ingredients].sort((a, b) => a.position - b.position)
  const steps = [...recipe.recipe_steps].sort((a, b) => a.step_number - b.step_number)
  const photo = recipe.recipe_photos.find((p) => p.is_primary) ?? recipe.recipe_photos[0]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-3">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={recipe.title}
            className="aspect-video w-full rounded-lg object-cover"
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{recipe.title}</h1>
          {user && (
            <FavoriteButton recipeId={recipe.id} slug={recipe.slug} initialFavorited={isFavorited} />
          )}
        </div>

        {recipe.description && (
          <p className="text-muted-foreground">{recipe.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {recipe.cuisines?.[0]?.name && (
            <span className="rounded-full bg-muted px-2.5 py-1">{recipe.cuisines[0].name}</span>
          )}
          <span className="rounded-full bg-muted px-2.5 py-1 capitalize">{recipe.diet_type}</span>
          {recipe.recipe_meal_types.map((rmt, i) => (
            <span key={i} className="rounded-full bg-muted px-2.5 py-1">
              {rmt.meal_types?.[0]?.name}
            </span>
          ))}
          {recipe.total_time_minutes ? (
            <span className="rounded-full bg-muted px-2.5 py-1">{recipe.total_time_minutes} min</span>
          ) : null}
          {/* servings column was dropped — no longer displayed
          {recipe.servings && <span className="rounded-full bg-muted px-2.5 py-1">Serves {recipe.servings}</span>}
          */}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Ingredients</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {ingredients.map((ing) => (
            <li key={ing.id}>
              {[ing.quantity, ing.unit, ing.ingredients?.[0]?.name].filter(Boolean).join(' ')}
              {ing.note ? ` (${ing.note})` : ''}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Steps</h2>
        <ol className="flex flex-col gap-3 text-sm">
          {steps.map((step) => (
            <li key={step.id} className="flex gap-2">
              <span className="font-medium">{step.step_number}.</span>
              <span>
                {step.instruction}
                {step.timer_seconds ? ` (${Math.round(step.timer_seconds / 60)} min)` : ''}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {user && (
        <CommentsSection recipeId={recipe.id} slug={recipe.slug} initialComments={comments} />
      )}
    </div>
  )
}
