const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  if (!fs.existsSync(dir)) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
    } catch (err) {}
  });
  return filelist;
};

const srcFiles = walkSync(path.join(__dirname, 'src'));
const filesToProcess = [...srcFiles, path.join(__dirname, 'prisma/schema.prisma')];

filesToProcess.forEach(file => {
  if (!file.match(/\.(ts|tsx|css|prisma|md)$/)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Don't replace if it's already using a dynamic fallback like siteName || 'Anti Gravity'
  // But wait, the user wants the hardcoded texts gone. Let's just replace the raw string literals.
  
  if (content.includes('Anti Gravity 2.0')) {
    content = content.replace(/Anti Gravity 2.0/g, 'Our Blog');
    changed = true;
  }
  
  if (content.includes('Anti Gravity')) {
    content = content.replace(/Anti Gravity/g, 'Our Blog');
    changed = true;
  }
  
  if (content.includes('anti-gravity')) {
    content = content.replace(/anti-gravity/g, 'our-blog');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
console.log('Done.');
