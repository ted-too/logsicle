import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { getPlaiceholder } from 'plaiceholder'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'

const queryParamsSchema = z.object({
  f: z.enum(['base64', 'svg', 'css']).optional().default('base64'),
  s: z.coerce.number().min(4).max(64).optional().default(4)
})

export const APIRoute = createAPIFileRoute('/api/placeholder/$')({
  GET: async ({ params, request }) => {
    try {
      // Get the image path from params
      const imagePath = path.join(process.cwd(), 'public', params._splat || '')
      
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        return json({ error: 'Image not found' }, { status: 404 })
      }

      // Parse query parameters
      const rawQueryParams = Object.fromEntries(new URL(request.url).searchParams)
      const queryParams = queryParamsSchema.safeParse(rawQueryParams)

      if (!queryParams.success) {
        return json({ error: queryParams.error }, { status: 400 })
      }

      const { f: format, s: size } = queryParams.data

      // Read the image file
      const imageBuffer = await fs.promises.readFile(imagePath)

      // Generate placeholder with plaiceholder
      const placeholder = await getPlaiceholder(imageBuffer, {
        size: size,
      })

      // Return the requested format
      switch (format) {
        case 'base64':
          return json({ 
            format: 'base64',
            placeholder: placeholder.base64,
          })
        case 'svg':
          return json({ 
            format: 'svg',
            placeholder: placeholder.svg,
          })
        case 'css':
          return json({ 
            format: 'css',
            placeholder: placeholder.css,
          })
        default:
          return json({ 
            format: 'base64',
            placeholder: placeholder.base64,
          })
      }
    } catch (error) {
      console.error('Placeholder generation error:', error)
      return json({ error: 'Failed to generate placeholder' }, { status: 500 })
    }
  },
})
