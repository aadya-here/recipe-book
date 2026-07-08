import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  archived: 'bg-muted text-muted-foreground line-through',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  published: 'Published',
  archived: 'Archived',
}

export default async function MyRecipesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/my-recipes')
  }

  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, slug, title, status, created_at')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">Your submissions</h1>

      {!recipes || recipes.length === 0 ? (
        <p className="text-muted-foreground">
          You haven&apos;t submitted a recipe yet.{' '}
          <Link href="/submit" className="underline underline-offset-4">
            Submit one
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/r/${recipe.slug}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted"
              >
                <span className="font-medium">{recipe.title}</span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                    STATUS_STYLES[recipe.status]
                  )}
                >
                  {STATUS_LABELS[recipe.status] ?? recipe.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
