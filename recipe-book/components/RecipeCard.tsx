import Link from 'next/link'
import { cn, pickRotation } from '@/lib/utils'

type Recipe = {
  id: string
  slug: string
  title: string
  diet_type: string
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  servings: number | null
  cuisines: { name: string }[] | null
  recipe_photos: { url: string; is_primary: boolean }[]
}

const ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-[0.6deg]', 'rotate-[0.6deg]']

export function RecipeCard({ recipe, index = 0 }: { recipe: Recipe; index?: number }) {
  const photo = recipe.recipe_photos.find((p) => p.is_primary) ?? recipe.recipe_photos[0]
  const cuisine = recipe.cuisines?.[0]?.name

  return (
    <Link
      href={`/r/${recipe.slug}`}
      className={cn(
        'group flex flex-col gap-3 rounded-sm border border-amber-900/25 bg-amber-100 p-4 shadow-md transition-transform hover:z-10 hover:-translate-y-0.5 hover:rotate-0 hover:shadow-lg dark:border-amber-100/10 dark:bg-amber-950/40',
        pickRotation(index, ROTATIONS)
      )}
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent, transparent 26px, rgba(120, 72, 24, 0.16) 27px)',
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-amber-900/30 pb-2 dark:border-amber-100/20">
        <h3 className="font-[family-name:var(--font-handwriting)] text-2xl leading-tight text-amber-950 group-hover:underline dark:text-amber-100">
          {recipe.title}
        </h3>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt=""
            className="size-14 shrink-0 rounded-sm border border-amber-900/30 object-cover dark:border-amber-100/20"
          />
        )}
      </div>

      <div className="font-[family-name:var(--font-handwriting)] flex flex-wrap gap-x-4 gap-y-1 text-lg text-amber-900 dark:text-amber-200">
        <span>Serves: {recipe.servings ?? '—'}</span>
        <span>Prep: {recipe.prep_time_minutes ?? '—'} min</span>
        <span>Cook: {recipe.cook_time_minutes ?? '—'} min</span>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs text-amber-900/70 dark:text-amber-200/70">
        {cuisine && (
          <span className="rounded-full border border-amber-900/30 px-2 py-0.5 dark:border-amber-100/20">
            {cuisine}
          </span>
        )}
        <span className="rounded-full border border-amber-900/30 px-2 py-0.5 capitalize dark:border-amber-100/20">
          {recipe.diet_type}
        </span>
      </div>
    </Link>
  )
}
