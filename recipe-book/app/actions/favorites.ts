'use server'
import { createClient, requireUser } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleFavorite(recipeId: string, slug: string, isFavorited: boolean) {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  if (isFavorited) {
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)
  } else {
    await supabase
      .from('favorites')
      .insert({ user_id: user.id, recipe_id: recipeId })
  }

  revalidatePath(`/r/${slug}`)
}
