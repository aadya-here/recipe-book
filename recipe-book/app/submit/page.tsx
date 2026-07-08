import { createClient, requireUserOrRedirect } from '@/utils/supabase/server'
import { RecipeForm } from '@/components/RecipeForm'

export default async function SubmitPage() {
  const supabase = await createClient()
  await requireUserOrRedirect(supabase, '/login?next=/submit')

  const [{ data: cuisines }, { data: mealTypes }] = await Promise.all([
    supabase.from('cuisines').select('id, name').order('name'),
    supabase.from('meal_types').select('id, name').order('name'),
  ])

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold">Submit a recipe</h1>
      <RecipeForm cuisines={cuisines ?? []} mealTypes={mealTypes ?? []} />
    </div>
  )
}
