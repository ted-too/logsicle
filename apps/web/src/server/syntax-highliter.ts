import { createServerFn } from "@tanstack/react-start";
import sourceShell from "@wooorm/starry-night/source.shell";
import { z } from "zod";
import { createStarryNight } from "@wooorm/starry-night";
import { toHtml } from "hast-util-to-html";

export const getSyntaxHighlight = createServerFn({ method: "POST" })
	.validator(z.object({ code: z.string(), language: z.enum(["source.shell"]) }))
	.handler(async ({ context, data: { code, language } }) => {
		const starryNight = await createStarryNight([sourceShell]);
		const tree = starryNight.highlight(code, language);
		return toHtml(tree);
	});
