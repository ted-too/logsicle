const fs = require("fs");
const path = require("path");
const j = require("jscodeshift");
const parser = require("@babel/parser");

const directory = "apps/web/src/components/ui";

function transformCode(fileInfo) {
  const root = j(fileInfo.source, {
    parser: {
      parse: (source) =>
        parser.parse(source, {
          sourceType: "module",
          plugins: ["jsx", "typescript", "decorators-legacy"],
        }),
    },
  });

  // Find all const declarations that are components
  root
    .find(j.VariableDeclaration)
    .filter((path) => {
      const declaration = path.node.declarations?.[0];
      if (!declaration) return false;

      // Check if it's a component (starts with uppercase)
      if (
        !declaration.id ||
        !declaration.id.name ||
        !/^[A-Z]/.test(declaration.id.name)
      ) {
        return false;
      }

      // Check if it's a function we want to transform
      return (
        declaration.init &&
        (declaration.init.type === "ArrowFunctionExpression" ||
          declaration.init.type === "FunctionExpression")
      );
    })
    .forEach((path) => {
      try {
        const declaration = path.node.declarations[0];
        const componentName = declaration.id.name;
        const props = declaration.init.params[0];
        const body = declaration.init.body;

        // Create the function body
        const functionBody =
          body.type === "BlockStatement"
            ? body
            : j.blockStatement([j.returnStatement(body)]);

        // Create the new function declaration
        const functionDeclaration = j.functionDeclaration(
          j.identifier(componentName),
          [props],
          functionBody
        );

        // Copy type parameters if they exist
        if (declaration.init.typeParameters) {
          functionDeclaration.typeParameters = declaration.init.typeParameters;
        }

        // Replace the const declaration with the function declaration
        j(path).replaceWith(functionDeclaration);
      } catch (error) {
        console.error(
          `Error transforming ${path.node.declarations[0]?.id?.name}:`,
          error
        );
      }
    });

  return root.toSource({
    quote: "single",
    trailingComma: true,
  });
}

// Process all files
fs.readdirSync(directory)
  .filter((file) => file.endsWith(".tsx"))
  .forEach((file) => {
    try {
      const filePath = path.join(directory, file);
      const source = fs.readFileSync(filePath, "utf8");

      const transformed = transformCode({
        source,
        path: filePath,
      });

      fs.writeFileSync(filePath, transformed);
      console.log(`Successfully transformed: ${file}`);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  });
