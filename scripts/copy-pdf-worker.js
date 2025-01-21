const fs = require('fs');
const path = require('path');

// Source path of the PDF.js worker file
const workerPath = path.join(
  __dirname,
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.js'
);

// Destination path in the public directory
const destPath = path.join(__dirname, '../public/pdf.worker.js');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Copy the worker file
fs.copyFileSync(workerPath, destPath);

console.log('PDF.js worker file copied successfully!'); 