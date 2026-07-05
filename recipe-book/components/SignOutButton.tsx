'use client'
import { LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out">
        <LogOut />
      </Button>
    </form>
  )
}
