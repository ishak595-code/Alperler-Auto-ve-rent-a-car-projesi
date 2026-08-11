import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createZip() {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const distDir = path.join(rootDir, 'dist');
  
  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const zipName = 'alperler-rent-a-car-yeni-proje.zip';
  const publicZipPath = path.join(publicDir, zipName);
  
  console.log('Creating ZIP in public directory:', publicZipPath);
  
  const output = fs.createWriteStream(publicZipPath);
  
  // Instantiate ZipArchive directly
  const archive = new ZipArchive({
    zlib: { level: 9 } // Maximum compression
  });

  output.on('close', function() {
    console.log(`ZIP file created successfully! Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    
    // Copy the ZIP file to the dist folder too, so it is immediately served by the server
    if (fs.existsSync(distDir)) {
      const distZipPath = path.join(distDir, zipName);
      console.log('Copying ZIP to dist directory for immediate download:', distZipPath);
      try {
        fs.copyFileSync(publicZipPath, distZipPath);
        console.log('Copy to dist directory successful!');
      } catch (err) {
        console.error('Could not copy to dist (probably app is not yet built):', err.message);
      }
    } else {
      console.warn('dist/ directory does not exist yet. Running build will copy the public asset.');
    }
  });

  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn('Warning during archiving:', err);
    } else {
      throw err;
    }
  });

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);

  // Include dot files (e.g., .gitignore, .env.example)
  archive.glob('**/*', {
    cwd: rootDir,
    ignore: [
      'node_modules/**',
      '.angular/**',
      '.git/**',
      'dist/**',
      '*.zip',
      '.env',
      'firebase-applet-config.json' // keep credentials safe
    ],
    dot: true
  });

  await archive.finalize();
}

createZip().catch(console.error);
