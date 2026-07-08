'use client'
import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleFavorite } from '@/app/actions/favorites'
import { cn } from '@/lib/utils'

export function FavoriteButton({
  recipeId,
  slug,
  initialFavorited,
}: {
  recipeId: string
  slug: string
  initialFavorited: boolean
}) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const next = !favorited
    setFavorited(next)
    startTransition(async () => {
      try {
        await toggleFavorite(recipeId, slug, favorited)
      } catch {
        setFavorited(!next)
      }
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-pressed={favorited}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      disabled={isPending}
      onClick={handleClick}
    >
      <Heart className={cn(favorited && 'fill-destructive text-destructive')} />
    </Button>
  )
}
