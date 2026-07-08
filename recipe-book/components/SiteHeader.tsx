import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Heart, NotebookText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/SignOutButton'

export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-5">
        <Link href="/" className="shrink-0 text-sm font-semibold">
          Recipe Book
        </Link>

        {user && (
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/favorites" className="flex items-center gap-1.5 hover:text-foreground">
              <Heart className="size-4" />
              <span className="hidden sm:inline">Favorites</span>
            </Link>
            <Link href="/my-recipes" className="flex items-center gap-1.5 hover:text-foreground">
              <NotebookText className="size-4" />
              <span className="hidden sm:inline">My recipes</span>
            </Link>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {user && (
          <Button size="sm" variant="outline" render={<Link href="/submit" />}>
            <Plus />
            <span className="hidden sm:inline">Submit</span>
          </Button>
        )}

        {user ? (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="hidden min-w-0 truncate text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        ) : (
          <Button size="sm" render={<Link href="/login" />}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  )
}
