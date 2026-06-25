const fs = require('fs');

function replaceImages(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if missing
    if (!content.includes('import Image from')) {
      content = content.replace(/(import React.*?;\r?\n)/, '$1import Image from \'next/image\';\n');
    }
    
    // Replace img tags
    content = content.replace(/<img\s+([^>]*?)src=\{([^\}]+)\}([^>]*?)\/?>/g, (match, before, src, after) => {
      // Remove className, alt etc to reconstruct
      let altMatch = match.match(/alt=\{([^\}]+)\}/) || match.match(/alt="([^"]+)"/);
      let classMatch = match.match(/className="([^"]+)"/);
      
      let altAttr = altMatch ? altMatch[0] : 'alt="image"';
      let classAttr = classMatch ? classMatch[0] : '';
      
      return `<Image src={${src}} ${altAttr} fill ${classAttr} sizes="(max-width: 768px) 100vw, 50vw" />`;
    });
    
    fs.writeFileSync(filePath, content);
    console.log('Optimized images in', filePath);
  }
}

replaceImages('src/app/blog/page.tsx');
replaceImages('src/app/blog/[slug]/page.tsx');
replaceImages('src/app/team/[id]/page.tsx');
