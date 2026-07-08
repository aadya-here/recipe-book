import { z } from 'zod'

const optionalNumber = z.preprocess(
  (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
  z.number().optional()
)

export const recipeSchema = z.object({
  title: z.string().trim().min(3, 'Title is too short'),
  description: z.string().trim().optional(),
  cuisineId: z.string().optional(),
  dietType: z.enum(['veg', 'egg', 'non-veg', 'vegan']),
  mealTypeIds: z.array(z.string()).min(1, 'Pick at least one meal type'),
  prepTimeMinutes: optionalNumber,
  cookTimeMinutes: optionalNumber,
  // servings: optionalNumber, // servings column was dropped — no longer collected
  ingredients: z
    .array(
      z.object({
        ingredientName: z.string().trim().min(1, 'Required'),
        quantity: optionalNumber,
        unit: z.string().trim().optional(),
        note: z.string().trim().optional(),
      })
    )
    .min(1, 'Add at least one ingredient'),
  steps: z
    .array(
      z.object({
        instruction: z.string().trim().min(1, 'Required'),
        timerMinutes: optionalNumber,
      })
    )
    .min(1, 'Add at least one step'),
})

export type RecipeFormValues = z.infer<typeof recipeSchema>
