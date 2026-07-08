'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Shuffle } from 'lucide-react'
import { getRandomRecipeSlug } from '@/app/actions/recipes'

export function ShuffleButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  function shuffle(source: 'all' | 'favorites') {
    setError('')
    setOpen(false)
    startTransition(async () => {
      try {
        const slug = await getRandomRecipeSlug(source)
        if (!slug) {
          setError(
            source === 'favorites' ? "You haven't favorited any recipes yet" : 'No recipes yet'
          )
          return
        }
        router.push(`/r/${slug}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        <Shuffle className="size-3.5" />
        {isPending ? 'Picking…' : 'Surprise me'}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 flex w-48 flex-col gap-1 rounded-lg border border-border bg-popover p-1 shadow-md">
          <button
            type="button"
            onClick={() => shuffle('all')}
            className="rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted"
          >
            Any recipe
          </button>
          <button
            type="button"
            onClick={() => shuffle('favorites')}
            disabled={!isLoggedIn}
            className="rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-40"
          >
            From my favorites
          </button>
        </div>
      )}

      {error && (
        <p className="absolute right-0 mt-1 w-48 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
