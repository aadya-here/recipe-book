import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/SignOutButton'

export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
      <Link href="/" className="shrink-0 text-sm font-semibold">
        Recipe Book
      </Link>

      {user ? (
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="min-w-0 truncate text-sm text-muted-foreground">{user.email}</span>
          <SignOutButton />
        </div>
      ) : (
        <Button size="sm" render={<Link href="/login" />}>
          Sign in
        </Button>
      )}
    </header>
  )
}
