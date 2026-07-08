'use client'
import { useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { z } from 'zod'
import { recipeSchema, type RecipeFormValues } from '@/lib/schemas/recipe'
import { DIET_OPTIONS } from '@/lib/constants'

type RecipeFormInput = z.input<typeof recipeSchema>
import { createRecipe } from '@/app/actions/recipes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Option = { id: string; name: string }

export function RecipeForm({ cuisines, mealTypes }: { cuisines: Option[]; mealTypes: Option[] }) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipeFormInput, unknown, RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      title: '',
      description: '',
      dietType: 'veg',
      mealTypeIds: [],
      ingredients: [{ ingredientName: '', unit: '', note: '' }],
      steps: [{ instruction: '' }],
    },
  })

  const ingredientFields = useFieldArray({ control, name: 'ingredients' })
  const stepFields = useFieldArray({ control, name: 'steps' })

  async function onSubmit(values: RecipeFormValues, publish: boolean) {
    setSubmitting(true)
    setServerError('')
    try {
      await createRecipe(values, photo, publish)
    } catch (err) {
      setSubmitting(false)
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <form className="flex flex-col gap-8" onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register('title')} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} {...register('description')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Photo</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Cuisine</Label>
            <Controller
              control={control}
              name="cuisineId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a cuisine" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuisines.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Diet</Label>
            <Controller
              control={control}
              name="dietType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose diet type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIET_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Meal types</Label>
          <Controller
            control={control}
            name="mealTypeIds"
            render={({ field }) => (
              <div className="flex flex-wrap gap-4">
                {mealTypes.map((mt) => {
                  const checked = field.value?.includes(mt.id) ?? false
                  return (
                    <label key={mt.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          const next = value
                            ? [...(field.value ?? []), mt.id]
                            : (field.value ?? []).filter((id) => id !== mt.id)
                          field.onChange(next)
                        }}
                      />
                      {mt.name}
                    </label>
                  )
                })}
              </div>
            )}
          />
          {errors.mealTypeIds && (
            <p className="text-sm text-destructive">{errors.mealTypeIds.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prepTimeMinutes">Prep time (min)</Label>
            <Input id="prepTimeMinutes" type="number" {...register('prepTimeMinutes')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cookTimeMinutes">Cook time (min)</Label>
            <Input id="cookTimeMinutes" type="number" {...register('cookTimeMinutes')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="servings">Servings</Label>
            <Input id="servings" type="number" {...register('servings')} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Ingredients</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ingredientFields.append({ ingredientName: '', unit: '', note: '' })}
          >
            <Plus /> Add ingredient
          </Button>
        </div>

        {ingredientFields.fields.map((field, i) => (
          <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_auto] items-start gap-2">
            <Input placeholder="Ingredient" {...register(`ingredients.${i}.ingredientName`)} />
            <Input placeholder="Qty" type="number" {...register(`ingredients.${i}.quantity`)} />
            <Input placeholder="Unit" {...register(`ingredients.${i}.unit`)} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove ingredient"
              disabled={ingredientFields.fields.length === 1}
              onClick={() => ingredientFields.remove(i)}
            >
              <X />
            </Button>
          </div>
        ))}
        {errors.ingredients?.root && (
          <p className="text-sm text-destructive">{errors.ingredients.root.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Steps</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => stepFields.append({ instruction: '' })}
          >
            <Plus /> Add step
          </Button>
        </div>

        {stepFields.fields.map((field, i) => (
          <div key={field.id} className="grid grid-cols-[auto_1fr_120px_auto] items-start gap-2">
            <span className="pt-2 text-sm text-muted-foreground">{i + 1}.</span>
            <Textarea rows={2} placeholder="Instruction" {...register(`steps.${i}.instruction`)} />
            <Input
              placeholder="Timer (sec)"
              type="number"
              {...register(`steps.${i}.timerSeconds`)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove step"
              disabled={stepFields.fields.length === 1}
              onClick={() => stepFields.remove(i)}
            >
              <X />
            </Button>
          </div>
        ))}
        {errors.steps?.root && (
          <p className="text-sm text-destructive">{errors.steps.root.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={handleSubmit((values) => onSubmit(values, false))}
        >
          Save draft
        </Button>
        <Button
          type="button"
          disabled={submitting}
          onClick={handleSubmit((values) => onSubmit(values, true))}
        >
          {submitting ? 'Submitting…' : 'Submit recipe'}
        </Button>
      </div>
    </form>
  )
}
