const fs = require('fs');
const path = require('path');

// Read the app.js file
const appJS = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');

// Escape for JavaScript string literal
const escaped = appJS
  .replace(/\\/g, '\\\\')  // Escape backslashes
  .replace(/`/g, '\\`')    // Escape backticks  
  .replace(/\$/g, '\\$');  // Escape dollar signs

// Create the export file
const output = `// Auto-generated - do not edit manually
export default \`${escaped}\`;
`;

fs.writeFileSync(path.join(__dirname, 'src/frontend.js'), output);
console.log('✓ Frontend JavaScript bundled successfully');
