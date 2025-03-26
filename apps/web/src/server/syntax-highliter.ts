import { createServerFn } from "@tanstack/react-start";
import sourceShell from "@wooorm/starry-night/source.shell";
import { z } from "zod";
import { createStarryNight } from "@wooorm/starry-night";
import { toHtml } from "hast-util-to-html";

/**
 * @import {ElementContent, Element, RootContent, Root} from 'hast'
 */

/**
 * @param {Root} tree
 *   Tree.
 * @returns {undefined}
 *   Nothing.
 */

// biome-ignore lint/suspicious/noExplicitAny: dw about it
function  starryNightGutter(tree: any) {
  /** @type {Array<RootContent>} */
  const replacement = []
  const search = /\r?\n|\r/g
  let index = -1
  let start = 0
  let startTextRemainder = ''
  let lineNumber = 0

  while (++index < tree.children.length) {
    const child = tree.children[index]

    if (child.type === 'text') {
      let textStart = 0
      let match = search.exec(child.value)

      while (match) {
        // Nodes in this line.
        const line = /** @type {Array<ElementContent>} */ (
          tree.children.slice(start, index)
        )

        // Prepend text from a partial matched earlier text.
        if (startTextRemainder) {
          line.unshift({type: 'text', value: startTextRemainder})
          startTextRemainder = ''
        }

        // Append text from this text.
        if (match.index > textStart) {
          line.push({
            type: 'text',
            value: child.value.slice(textStart, match.index)
          })
        }

        // Add a line, and the eol.
        lineNumber += 1
        replacement.push(createLine(line, lineNumber), {
          type: 'text',
          value: match[0]
        })

        start = index + 1
        textStart = match.index + match[0].length
        match = search.exec(child.value)
      }

      // If we matched, make sure to not drop the text after the last line ending.
      if (start === index + 1) {
        startTextRemainder = child.value.slice(textStart)
      }
    }
  }

  const line = /** @type {Array<ElementContent>} */ (tree.children.slice(start))
  // Prepend text from a partial matched earlier text.
  if (startTextRemainder) {
    line.unshift({type: 'text', value: startTextRemainder})
    startTextRemainder = ''
  }

  if (line.length > 0) {
    lineNumber += 1
    replacement.push(createLine(line, lineNumber))
  }

  // Replace children with new array.
  tree.children = replacement
}

/**
 * @param {Array<ElementContent>} children
 * @param {number} line
 * @returns {Element}
 */

// biome-ignore lint/suspicious/noExplicitAny: dw about it
function createLine(children: any, line: any) {
  return {
    type: "element",
    tagName: 'span',
    properties: {className: 'line', dataLineNumber: line},
    children
  }
}

export const getSyntaxHighlight = createServerFn({ method: "POST" })
	.validator(z.object({ code: z.string(), language: z.enum(["source.shell"]) }))
	.handler(async ({ context, data: { code, language } }) => {
		const starryNight = await createStarryNight([sourceShell]);
		const tree = starryNight.highlight(code, language);
		starryNightGutter(tree);
		return toHtml(tree);
	});
