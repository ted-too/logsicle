const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const directory = 'apps/web/src/components/ui';

function transformCode(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  traverse(ast, {
    VariableDeclaration(path) {
      const declaration = path.node.declarations[0];
      if (!t.isIdentifier(declaration.id)) return;
      
      // Check if it's a component (starts with uppercase)
      if (!/^[A-Z]/.test(declaration.id.name)) return;

      const arrowFunction = declaration.init;
      if (!t.isArrowFunctionExpression(arrowFunction)) return;

      // Create the function params
      const params = [{
        type: 'ObjectPattern',
        properties: [
          {
            type: 'ObjectProperty',
            key: t.identifier('className'),
            value: t.identifier('className'),
            shorthand: true,
          },
          {
            type: 'RestElement',
            argument: t.identifier('props'),
          },
        ],
      }];

      // Create the return statement
      const returnStatement = t.returnStatement(arrowFunction.body);

      // Create the function
      const functionDeclaration = t.functionDeclaration(
        t.identifier(declaration.id.name),
        params,
        t.blockStatement([returnStatement]),
        false,
        false
      );

      // Add type annotation if it exists
      if (arrowFunction.typeParameters) {
        functionDeclaration.typeParameters = arrowFunction.typeParameters;
      }

      path.replaceWith(functionDeclaration);
    }
  });

  return generate(ast).code;
}

// Process all TypeScript files in the directory
fs.readdirSync(directory)
  .filter(file => file.endsWith('.tsx'))
  .forEach(file => {
    const filePath = path.join(directory, file);
    const code = fs.readFileSync(filePath, 'utf8');
    const transformed = transformCode(code);
    fs.writeFileSync(filePath, transformed);
    console.log(`Transformed: ${file}`);
  });