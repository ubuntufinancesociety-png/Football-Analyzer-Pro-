import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function createProjectZip(): string {
  const zip = new AdmZip();
  const outputPath = path.resolve(rootDir, 'Football-Analyzer-Pro-Updated.zip');

  const ignoreList = new Set([
    'node_modules',
    '.git',
    'dist',
    'Football-Analyzer-Pro-Updated.zip',
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
  console.log(`Successfully created zip file at: ${outputPath}`);
  return outputPath;
}

// Run if directly executed
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createProjectZip();
}
