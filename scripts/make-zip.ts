import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

export function createProjectZip(): string {
  // 1. Create Netlify-Deploy.zip (ready for 1-click Netlify Drop upload)
  if (fs.existsSync(distDir)) {
    const netlifyZip = new AdmZip();
    const distFiles = fs.readdirSync(distDir);
    
    function addDistFolder(currentDir: string, zipPath = '') {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          addDistFolder(fullPath, zipPath ? `${zipPath}/${item}` : item);
        } else {
          const fileContent = fs.readFileSync(fullPath);
          netlifyZip.addFile(zipPath ? `${zipPath}/${item}` : item, fileContent);
        }
      }
    }

    addDistFolder(distDir);
    const netlifyOutputPath = path.resolve(rootDir, 'Netlify-Deploy.zip');
    netlifyZip.writeZip(netlifyOutputPath);
    console.log(`Successfully created Netlify deploy package at: ${netlifyOutputPath}`);
  }

  // 2. Create full source zip (Football-Analyzer-Pro-Updated.zip)
  const zip = new AdmZip();
  const outputPath = path.resolve(rootDir, 'Football-Analyzer-Pro-Updated.zip');

  const ignoreList = new Set([
    'node_modules',
    '.git',
    'Football-Analyzer-Pro-Updated.zip',
    'Netlify-Deploy.zip',
    '.cache',
  ]);

  function addFolderToZip(currentDir: string, zipPath = '') {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      if (ignoreList.has(item)) continue;

      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        addFolderToZip(fullPath, zipPath ? `${zipPath}/${item}` : item);
      } else {
        const fileContent = fs.readFileSync(fullPath);
        zip.addFile(zipPath ? `${zipPath}/${item}` : item, fileContent);
      }
    }
  }

  addFolderToZip(rootDir);
  zip.writeZip(outputPath);
  console.log(`Successfully created source zip file at: ${outputPath}`);
  return outputPath;
}

// Run if directly executed
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createProjectZip();
}
