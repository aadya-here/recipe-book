'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addComment(recipeId: string, slug: string, body: string) {
  const trimmed = body.trim()
  if (!trimmed) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be signed in')

  await supabase.from('comments').insert({ user_id: user.id, recipe_id: recipeId, body: trimmed })
  revalidatePath(`/r/${slug}`)
}

export async function deleteComment(commentId: string, slug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be signed in')

  await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user.id)
  revalidatePath(`/r/${slug}`)
}
