import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — ignore if you
            // have middleware refreshing sessions (see step 4)
          }
        },
      },
    }
  )
}

export async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be signed in')
  return user
}

export async function requireUserOrRedirect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  redirectTo: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(redirectTo)
  return user
}
