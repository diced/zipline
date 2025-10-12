const fs = require('fs');
const path = require('path');

/**
 * Remove comments from code while preserving strings and important content
 * @param {string} code - The source code
 * @returns {string} - Code without comments
 */
function removeComments(code) {
  let result = '';
  let i = 0;
  
  while (i < code.length) {
    // Handle string literals (single quotes)
    if (code[i] === "'" && (i === 0 || code[i - 1] !== '\\')) {
      result += code[i++];
      while (i < code.length && (code[i] !== "'" || code[i - 1] === '\\')) {
        result += code[i++];
      }
      if (i < code.length) result += code[i++];
      continue;
    }
    
    // Handle string literals (double quotes)
    if (code[i] === '"' && (i === 0 || code[i - 1] !== '\\')) {
      result += code[i++];
      while (i < code.length && (code[i] !== '"' || code[i - 1] === '\\')) {
        result += code[i++];
      }
      if (i < code.length) result += code[i++];
      continue;
    }
    
    // Handle template literals (backticks)
    if (code[i] === '`' && (i === 0 || code[i - 1] !== '\\')) {
      result += code[i++];
      while (i < code.length && (code[i] !== '`' || code[i - 1] === '\\')) {
        result += code[i++];
      }
      if (i < code.length) result += code[i++];
      continue;
    }
    
    // Handle single-line comments (//)
    if (code[i] === '/' && code[i + 1] === '/') {
      i += 2;
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      // Keep the newline
      if (i < code.length) {
        result += code[i++];
      }
      continue;
    }
    
    // Handle multi-line comments (/* */)
    if (code[i] === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) {
        i++;
      }
      i += 2; // Skip */
      continue;
    }
    
    // Handle JSX comments ({/* */})
    if (code[i] === '{' && code[i + 1] === '/' && code[i + 2] === '*') {
      i += 3;
      while (i < code.length - 2 && !(code[i] === '*' && code[i + 1] === '/' && code[i + 2] === '}')) {
        i++;
      }
      i += 3; // Skip */}
      continue;
    }
    
    // Regular character
    result += code[i++];
  }
  
  return result;
}

/**
 * Process a single file
 * @param {string} filePath - Path to the file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleanedContent = removeComments(content);
    
    // Only write if content changed
    if (content !== cleanedContent) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      console.log(`✓ Processed: ${filePath}`);
      return true;
    } else {
      console.log(`- No changes: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively process all files in a directory
 * @param {string} dir - Directory path
 * @param {string[]} extensions - File extensions to process
 */
function processDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const excludeDirs = ['node_modules', '.git', 'build', 'dist', 'generated', '.next'];
  let processedCount = 0;
  
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          if (processFile(fullPath)) {
            processedCount++;
          }
        }
      }
    }
  }
  
  walk(dir);
  return processedCount;
}

// Main execution
const targetPath = process.argv[2] || '.';
const isDirectory = fs.statSync(targetPath).isDirectory();

console.log('🧹 Starting comment removal...\n');

if (isDirectory) {
  console.log(`Processing directory: ${targetPath}\n`);
  const count = processDirectory(targetPath);
  console.log(`\n✨ Done! Modified ${count} file(s).`);
} else {
  console.log(`Processing file: ${targetPath}\n`);
  processFile(targetPath);
  console.log('\n✨ Done!');
}
