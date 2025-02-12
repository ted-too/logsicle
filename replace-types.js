const fs = require('fs');
const path = require('path');

// Directory containing your UI components
const directory = 'apps/web/src/components/ui';

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // First replacement
  content = content.replace(/React\.ComponentPropsWithoutRef/g, 'React.ComponentProps');
  
  // Second replacement
  content = content.replace(/& \{[\s\S]*?ref: React\.RefObject<React\.ElementRef<typeof .*?>>;\s*\}/g, '');
  
  fs.writeFileSync(filePath, content);
}

// Process all TypeScript files in the directory
fs.readdirSync(directory)
  .filter(file => file.endsWith('.tsx'))
  .forEach(file => {
    const filePath = path.join(directory, file);
    replaceInFile(filePath);
    console.log(`Processed: ${file}`);
  });