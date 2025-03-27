import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { z } from "zod";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const queryParamsSchema = z.object({
  w: z.coerce.number().optional(),
  h: z.coerce.number().optional(),
  q: z.coerce.number().min(1).max(100).optional().default(75),
  f: z.enum(["png", "jpg", "webp"]).optional().default("webp"),
});

export const APIRoute = createAPIFileRoute("/api/image/$")({
  GET: async ({ params, request }) => {
    const imagePath = path.join(process.cwd(), "public", params._splat || "");

    if (!fs.existsSync(imagePath)) {
      return json({ error: "Image not found" }, { status: 404 });
    }

    const rawQueryParams = Object.fromEntries(new URL(request.url).searchParams)
    const queryParams = queryParamsSchema.safeParse(rawQueryParams)

    if (!queryParams.success) {
      return json({ error: queryParams.error, }, { status: 400 });
    }

    const { w, h, q, f } = queryParams.data;

    try {
      const imageBuffer = await fs.promises.readFile(imagePath);
      
      // Get original image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      const resizeOptions: sharp.ResizeOptions = {
        fit: "contain",
        withoutEnlargement: true,
      };

      // Use original dimensions if width/height not specified
      if (!w && !h) {
        resizeOptions.width = metadata.width;
      } else {
        if (w) resizeOptions.width = w;
        if (h) resizeOptions.height = h;
      }

      let pipeline = sharp(imageBuffer).resize(resizeOptions);

      // Set format and quality
      switch (f) {
        case "webp":
          pipeline = pipeline.webp({ quality: q });
          break;
        case "png":
          pipeline = pipeline.png({ quality: q });
          break;
        case "jpg":
          pipeline = pipeline.jpeg({ quality: q });
          break;
      }

      // Process the image
      const optimizedImage = await pipeline.toBuffer();

      // Set appropriate headers
      const headers = new Headers();
      headers.set("Content-Type", `image/${f}`);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      return new Response(optimizedImage, {
        headers,
        status: 200,
      });
    } catch (error) {
      console.error("Image processing error: ", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  },
});
