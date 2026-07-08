'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Facet = { value: string; label: string }

export function FilterBar({
  cuisines,
  mealTypes,
  timeBuckets,
  dietOptions,
}: {
  cuisines: Facet[]
  mealTypes: Facet[]
  timeBuckets: Facet[]
  dietOptions: Facet[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const cuisine = searchParams.get('cuisine') ?? ''
  const meal = searchParams.get('meal') ?? ''
  const time = searchParams.get('time') ?? ''
  const diet = searchParams.get('diet') ?? ''
  const q = searchParams.get('q') ?? ''
  const match = searchParams.get('match') === 'all' ? 'all' : 'any'
  const hasActive = Boolean(cuisine || meal || time || diet || q)

  const [searchValue, setSearchValue] = useState(q)

  useEffect(() => {
    setSearchValue(q)
  }, [q])

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function commitSearch() {
    setParam('q', searchValue.trim() || null)
  }

  function setMatch(mode: 'any' | 'all') {
    setParam('match', mode === 'any' ? null : mode)
  }

  function clearAll() {
    router.push(pathname)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={cuisine} onValueChange={(v) => setParam('cuisine', v === cuisine ? null : v)}>
          <SelectTrigger size="sm" className="bg-background">
            <SelectValue placeholder="Any cuisine" />
          </SelectTrigger>
          <SelectContent>
            {cuisines.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={meal} onValueChange={(v) => setParam('meal', v === meal ? null : v)}>
          <SelectTrigger size="sm" className="bg-background">
            <SelectValue placeholder="Any meal" />
          </SelectTrigger>
          <SelectContent>
            {mealTypes.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <Select value={time} onValueChange={(v) => setParam('time', v === time ? null : v)}>
          <SelectTrigger size="sm" className="bg-background">
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            {timeBuckets.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={diet} onValueChange={(v) => setParam('diet', v === diet ? null : v)}>
          <SelectTrigger size="sm" className="bg-background">
            <SelectValue placeholder="Any diet" />
          </SelectTrigger>
          <SelectContent>
            {dietOptions.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <button
            type="button"
            onClick={commitSearch}
            aria-label="Search"
            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <Search className="size-3.5" />
          </button>
          <Input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="e.g. garlic, tomato"
            className="h-8 bg-background pl-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSearch()
            }}
          />
        </div>

        {q.includes(',') && (
          <div className="flex items-center gap-1 rounded-full border border-border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMatch('any')}
              className={cn(
                'rounded-full px-2 py-1 transition-colors',
                match === 'any' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Any
            </button>
            <button
              type="button"
              onClick={() => setMatch('all')}
              className={cn(
                'rounded-full px-2 py-1 transition-colors',
                match === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
          </div>
        )}

        {hasActive && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            <X className="size-3" /> Clear all
          </button>
        )}
      </div>
    </div>
  )
}
