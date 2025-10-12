const fs = require('fs');
const path = require('path');


function removeComments(code) {
  let result = '';
  let i = 0;
  
  while (i < code.length) {
    
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
    
    
    if (code[i] === '{') {
      
      let j = i + 1;
      
      while (j < code.length && /\s/.test(code[j])) {
        j++;
      }
      
      // Check for JSX multi-line comments: {/* ... */}
      if (j < code.length && code[j] === '/' && j + 1 < code.length && code[j + 1] === '*') {
        // This is a JSX multi-line comment: {/* ... */}
        let commentStart = j + 2;
        let commentEnd = j + 2;
        
        // Find the end of the comment
        while (commentEnd < code.length - 1 && !(code[commentEnd] === '*' && code[commentEnd + 1] === '/')) {
          commentEnd++;
        }
        
        if (commentEnd < code.length - 1) {
          // Found the end of the comment
          const commentContent = code.substring(commentStart, commentEnd).trim();
          
          // Check if this contains TypeScript directives that should be preserved
          const tsDirectives = [
            '@ts-ignore', '@ts-expect-error', '@ts-nocheck', '@ts-check',
            'eslint-disable', 'eslint-enable', 'eslint-disable-line', 'eslint-disable-next-line',
            'prettier-ignore', 'istanbul ignore', 'c8 ignore'
          ];
          
          const shouldPreserve = tsDirectives.some(directive => 
            commentContent.toLowerCase().includes(directive.toLowerCase())
          );
          
          if (shouldPreserve) {
            // Preserve this JSX comment with TypeScript directive
            // Add the entire comment: {/* ... */}
            let endOfComment = commentEnd + 2; // Position after */
            while (endOfComment < code.length && code[endOfComment] !== '}') {
              endOfComment++;
            }
            if (endOfComment < code.length) {
              endOfComment++; // Include the closing }
            }
            
            // Add the entire preserved comment
            while (i < endOfComment && i < code.length) {
              result += code[i++];
            }
            continue;
          } else {
            // Remove this JSX comment - skip to after the closing */}
            i = commentEnd + 3; // Skip past */}
            continue;
          }
        }
      }
      
      // Handle regular JSX expressions (not comments)
      if (j < code.length && code[j] !== '/' && code[j] !== '*') {
        
        let braceCount = 1;
        let k = j;
        while (k < code.length && braceCount > 0) {
          if (code[k] === '{') braceCount++;
          else if (code[k] === '}') braceCount--;
          k++;
        }
        
        
        if (braceCount === 0) {
          const content = code.substring(j, k - 1).trim();
          
          // Check if this is a JSX-style TypeScript directive that should be preserved
          const jsxTsDirectives = [
            '@ts ignore', '@ts-ignore', '@ts expect-error', '@ts-expect-error', 
            '@ts nocheck', '@ts-nocheck', '@ts check', '@ts-check'
          ];
          
          const isJsxTsDirective = jsxTsDirectives.some(directive => 
            content.toLowerCase().includes(directive.toLowerCase())
          );
          
          if (isJsxTsDirective) {
            // This is a JSX TypeScript directive, preserve it
            result += code[i++];
            continue;
          }
          
          // Be much more restrictive about what we consider a JSX comment
          // Only remove if it's clearly a comment and not valid JavaScript/TypeScript code
          if (content.length > 0 && 
              // Must not contain any JavaScript operators, keywords, or syntax
              !/[=;()[\]{}.,+\-*/%<>!&|?:$]/.test(content) && 
              // Must not be a variable name
              !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(content) && 
              // Must not be a literal value
              !/^(true|false|null|undefined|\d+)$/.test(content) && 
              // Must not be a string
              !/^['"`]/.test(content) && 
              // Must not contain TypeScript keywords
              !/\b(as|unknown|any|string|number|boolean|object|function|typeof|instanceof|extends|implements|interface|type|enum|namespace|module|declare|abstract|readonly|keyof|infer|never|void)\b/.test(content) &&
              // Must not contain common JavaScript keywords
              !/\b(const|let|var|function|class|if|else|for|while|do|switch|case|default|try|catch|finally|throw|return|break|continue|new|this|super|static|async|await|yield|import|export|from|default)\b/.test(content) &&
              // Only allow simple comment-like text (letters, spaces, basic punctuation)
              /^[a-zA-Z\s\-.,!?]+$/.test(content) &&
              // Must be at least somewhat comment-like (not just a single word)
              (content.includes(' ') || content.length > 10)) {
            i = k; // Skip the entire {comment}
            continue;
          }
        }
      }
      
      // If not a comment, treat as regular character
      result += code[i++];
      continue;
    }
    
    // Handle single-line comments (//) and inline comments (code //comment)
    if (code[i] === '/' && i + 1 < code.length && code[i + 1] === '/') {
      // Check if this is a TypeScript directive comment that should be preserved
      const commentStart = i;
      let commentEnd = i + 2;
      while (commentEnd < code.length && code[commentEnd] !== '\n' && code[commentEnd] !== '\r') {
        commentEnd++;
      }
      
      const commentContent = code.substring(i + 2, commentEnd).trim();
      
      // Preserve TypeScript directive comments
      const tsDirectives = [
        '@ts-ignore', '@ts-expect-error', '@ts-nocheck', '@ts-check',
        'eslint-disable', 'eslint-enable', 'eslint-disable-line', 'eslint-disable-next-line',
        'prettier-ignore', 'istanbul ignore', 'c8 ignore'
      ];
      
      const shouldPreserve = tsDirectives.some(directive => 
        commentContent.startsWith(directive) || commentContent.startsWith(' ' + directive)
      );
      
      if (shouldPreserve) {
        // Preserve this directive comment
        while (i <= commentEnd && i < code.length) {
          result += code[i++];
        }
      } else {
        // Skip the // and everything until newline
        i += 2;
        while (i < code.length && code[i] !== '\n' && code[i] !== '\r') {
          i++;
        }
        // Keep the newline if present
        if (i < code.length && (code[i] === '\n' || code[i] === '\r')) {
          result += code[i++];
          // Handle \r\n
          if (i < code.length && code[i - 1] === '\r' && code[i] === '\n') {
            result += code[i++];
          }
        }
      }
      continue;
    }
    
    // Handle multi-line comments (/* */) but preserve JSDoc comments (/** */)
    if (code[i] === '/' && i + 1 < code.length && code[i + 1] === '*') {
      // Check if it's a JSDoc comment (/** */)
      if (i + 2 < code.length && code[i + 2] === '*') {
        // This is a JSDoc comment, preserve it
        result += code[i++]; // Add /
        result += code[i++]; // Add *
        result += code[i++]; // Add *
        
        // Copy the rest of the JSDoc comment
        while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) {
          result += code[i++];
        }
        if (i < code.length - 1) {
          result += code[i++]; // Add *
          result += code[i++]; // Add /
        }
        continue;
      } else {
        // Regular multi-line comment, remove it
        i += 2;
        while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) {
          i++;
        }
        if (i < code.length - 1) {
          i += 2; // Skip */
        }
        continue;
      }
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
 * Process a single file asynchronously
 * @param {string} filePath - Path to the file
 */
async function processFileAsync(filePath) {
  return new Promise((resolve) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const cleanedContent = removeComments(content);
      
      // Only write if content changed
      if (content !== cleanedContent) {
        fs.writeFileSync(filePath, cleanedContent, 'utf8');
        console.log(`✓ Processed: ${filePath}`);
        resolve(true);
      } else {
        console.log(`- No changes: ${filePath}`);
        resolve(false);
      }
    } catch (error) {
      console.error(`✗ Error processing ${filePath}:`, error.message);
      resolve(false);
    }
  });
}

/**
 * Process files with concurrency limit
 * @param {string[]} filePaths - Array of file paths to process
 * @param {number} maxConcurrency - Maximum number of concurrent operations
 */
async function processFilesWithLimit(filePaths, maxConcurrency = 5) {
  let processedCount = 0;
  let currentIndex = 0;
  const activePromises = [];

  async function processNext() {
    if (currentIndex >= filePaths.length) {
      return;
    }

    const filePath = filePaths[currentIndex++];
    const result = await processFileAsync(filePath);
    if (result) {
      processedCount++;
    }

    // Process next file
    return processNext();
  }

  // Start initial batch of concurrent operations
  for (let i = 0; i < Math.min(maxConcurrency, filePaths.length); i++) {
    activePromises.push(processNext());
  }

  // Wait for all operations to complete
  await Promise.all(activePromises);
  return processedCount;
}

/**
 * Recursively collect all files in a directory
 * @param {string} dir - Directory path
 * @param {string[]} extensions - File extensions to process
 */
function collectFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const excludeDirs = ['node_modules', '.git', 'build', 'dist', 'generated', '.next'];
  const files = [];
  
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
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Recursively process all files in a directory
 * @param {string} dir - Directory path
 * @param {string[]} extensions - File extensions to process
 * @param {number} maxConcurrency - Maximum number of concurrent operations
 */
async function processDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx'], maxConcurrency = 5) {
  const files = collectFiles(dir, extensions);
  
  if (files.length === 0) {
    console.log('No files found to process.');
    return 0;
  }
  
  console.log(`Found ${files.length} file(s) to process with max concurrency of ${maxConcurrency}...\n`);
  return await processFilesWithLimit(files, maxConcurrency);
}

/**
 * Synchronous version for backward compatibility
 * @param {string} dir - Directory path
 * @param {string[]} extensions - File extensions to process
 */
function processDirectorySync(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
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

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    targetPath: '.',
    maxConcurrency: 5,
    sync: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--sync') {
      options.sync = true;
    } else if (arg === '--concurrency' || arg === '-c') {
      const next = args[i + 1];
      if (next && !isNaN(next)) {
        options.maxConcurrency = Math.max(1, parseInt(next));
        i++; // Skip next argument
      }
    } else if (!arg.startsWith('-')) {
      options.targetPath = arg;
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🧹 Comment Removal Tool

Usage: node remove-comments.js [path] [options]

Arguments:
  path                    Target file or directory (default: current directory)

Options:
  -c, --concurrency <n>   Maximum concurrent file processing (default: 5)
  --sync                  Use synchronous processing (no concurrency limit)
  -h, --help             Show this help message

Examples:
  node remove-comments.js                           # Process current directory with default settings
  node remove-comments.js ./src                     # Process src directory
  node remove-comments.js ./src -c 10               # Process with max 10 concurrent operations
  node remove-comments.js ./src --sync              # Process synchronously (one file at a time)
  node remove-comments.js ./file.js                 # Process single file

Comment types removed:
  - Single-line comments: // comment
  - Inline comments: code // comment  
  - JSX-style comments: {comment}
  - Multi-line comments: /* comment */ (except JSDoc /** */)

JSDoc comments (/** */) are preserved.
`);
}

// Main execution
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  const targetPath = options.targetPath;
  
  try {
    const isDirectory = fs.statSync(targetPath).isDirectory();

    console.log('🧹 Starting comment removal...\n');

    if (isDirectory) {
      console.log(`Processing directory: ${targetPath}`);
      
      if (options.sync) {
        console.log('Using synchronous processing...\n');
        const count = processDirectorySync(targetPath);
        console.log(`\n✨ Done! Modified ${count} file(s).`);
      } else {
        console.log(`Using async processing with max concurrency: ${options.maxConcurrency}\n`);
        const count = await processDirectory(targetPath, ['.ts', '.tsx', '.js', '.jsx'], options.maxConcurrency);
        console.log(`\n✨ Done! Modified ${count} file(s).`);
      }
    } else {
      console.log(`Processing file: ${targetPath}\n`);
      processFile(targetPath);
      console.log('\n✨ Done!');
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(`✗ Unexpected error: ${error.message}`);
  process.exit(1);
});
