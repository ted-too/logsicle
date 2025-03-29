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

function starryNightGutter(tree: any) {
  /** @type {Array<RootContent>} */
  const replacement = [];
  const search = /\r?\n|\r/g;
  let index = -1;
  let start = 0;
  let startTextRemainder = "";
  let lineNumber = 0;

  while (++index < tree.children.length) {
    const child = tree.children[index];

    if (child.type === "text") {
      let textStart = 0;
      let match = search.exec(child.value);

      while (match) {
        // Nodes in this line.
        const line = /** @type {Array<ElementContent>} */ tree.children.slice(
          start,
          index
        );

        // Prepend text from a partial matched earlier text.
        if (startTextRemainder) {
          line.unshift({ type: "text", value: startTextRemainder });
          startTextRemainder = "";
        }

        // Append text from this text.
        if (match.index > textStart) {
          line.push({
            type: "text",
            value: child.value.slice(textStart, match.index),
          });
        }

        // Add a line, and the eol.
        lineNumber += 1;
        replacement.push(createLine(line, lineNumber), {
          type: "text",
          value: match[0],
        });

        start = index + 1;
        textStart = match.index + match[0].length;
        match = search.exec(child.value);
      }

      // If we matched, make sure to not drop the text after the last line ending.
      if (start === index + 1) {
        startTextRemainder = child.value.slice(textStart);
      }
    }
  }

  const line = /** @type {Array<ElementContent>} */ tree.children.slice(start);
  // Prepend text from a partial matched earlier text.
  if (startTextRemainder) {
    line.unshift({ type: "text", value: startTextRemainder });
    startTextRemainder = "";
  }

  if (line.length > 0) {
    lineNumber += 1;
    replacement.push(createLine(line, lineNumber));
  }

  // Replace children with new array.
  tree.children = replacement;
}

/**
 * @param {Array<ElementContent>} children
 * @param {number} line
 * @returns {Element}
 */

function createLine(children: any, line: any) {
  return {
    type: "element",
    tagName: "span",
    properties: { className: "line", dataLineNumber: line },
    children,
  };
}

// Define code generation functions on the server
const generateCurlCode = (params: { apiKey: string; projectId: string }) => {
  const apiUrl = process.env.VITE_API_URL || import.meta.env.VITE_API_URL;
  return `curl --location '${apiUrl}/v1/ingest/event' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer ${params.apiKey}' \\
--data '{
    "project_id": "${params.projectId}",
    "name": "test_event"
}'`;
};

// Add a new server function to generate code snippets
export const getCodeSnippets = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string(),
      apiKey: z.string(),
    })
  )
  .handler(async ({ data: { projectId, apiKey } }) => {
    // Generate code snippets for different tabs
    const snippets = [
      {
        label: "Try Locally",
        value: "local",
        language: "source.shell",
        code: generateCurlCode({ projectId, apiKey }),
        Icon: "TerminalIcon",
      },
      // Add more snippets as needed
    ];

    // Generate highlighted HTML for each snippet
    const starryNight = await createStarryNight([sourceShell]);

    const highlightedSnippets = await Promise.all(
      snippets.map(async (snippet) => {
        const tree = starryNight.highlight(snippet.code, snippet.language);
        starryNightGutter(tree);
        return {
          ...snippet,
          highlightedCode: toHtml(tree),
        };
      })
    );

    return highlightedSnippets;
  });
