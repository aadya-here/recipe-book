'use client'
import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addComment, deleteComment } from '@/app/actions/comments'
import { cn, pickRotation } from '@/lib/utils'

type Comment = {
  id: string
  body: string
  created_at: string
}

const ROTATIONS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2']

export function CommentsSection({
  recipeId,
  slug,
  initialComments,
}: {
  recipeId: string
  slug: string
  initialComments: Comment[]
}) {
  const [comments, setComments] = useState(initialComments)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    const body = draft.trim()
    if (!body) return
    setDraft('')
    startTransition(async () => {
      await addComment(recipeId, slug, body)
      setComments((prev) => [
        { id: crypto.randomUUID(), body, created_at: new Date().toISOString() },
        ...prev,
      ])
    })
  }

  function handleDelete(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id))
    startTransition(async () => {
      await deleteComment(id, slug)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Your notes on this recipe
      </h2>
      <p className="text-xs text-muted-foreground">
        Only you can see these — like scribbles in the margin of your own cookbook.
      </p>

      <div className="flex flex-col gap-3 rounded-lg bg-amber-100/60 p-4 dark:bg-amber-950/20">
        <Textarea
          placeholder="Made this with less chili, worked great…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
        />
        <Button type="button" size="sm" className="self-end" disabled={isPending || !draft.trim()} onClick={handleAdd}>
          Add note
        </Button>
      </div>

      {comments.length > 0 && (
        <div className="flex flex-wrap gap-4 pt-2">
          {comments.map((comment, i) => (
            <div
              key={comment.id}
              className={cn(
                'group relative w-48 rounded-sm bg-yellow-200 p-4 text-sm text-yellow-950 shadow-md transition-transform hover:z-10 hover:rotate-0',
                pickRotation(i, ROTATIONS)
              )}
            >
              <button
                type="button"
                onClick={() => handleDelete(comment.id)}
                aria-label="Delete note"
                className="absolute top-1 right-1 rounded p-1 text-yellow-950/40 opacity-0 transition-opacity hover:text-yellow-950 group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
              <p className="whitespace-pre-wrap break-words pr-3">{comment.body}</p>
              <p className="mt-2 text-[10px] text-yellow-950/50">
                {new Date(comment.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
