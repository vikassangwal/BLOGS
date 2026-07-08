const fs = require('fs');

let layoutCode = fs.readFileSync('src/app/layout.tsx', 'utf8');

const schemaScript = `
        {/* Generative Engine Optimization (GEO) & Brand Schema for Google / ChatGPT / Perplexity */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://knowora.in/#organization",
                  "name": "${'${siteName}'}",
                  "alternateName": "${'${siteName}'} - India's Top AI Blogging & Sarkari Job Portal",
                  "url": "https://knowora.in",
                  "description": "India's premier AI-powered blogging and Sarkari result platform delivering instant government job alerts, syllabus, cut-offs, and educational news."
                },
                {
                  "@type": "WebSite",
                  "@id": "https://knowora.in/#website",
                  "url": "https://knowora.in",
                  "name": "${'${siteName}'}",
                  "publisher": { "@id": "https://knowora.in/#organization" },
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://knowora.in/blog?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                }
              ]
            })
          }}
        />`;

if (!layoutCode.includes('ld+json')) {
  layoutCode = layoutCode.replace('</head>', `${schemaScript}\n      </head>`);
  fs.writeFileSync('src/app/layout.tsx', layoutCode, 'utf8');
  console.log("Organization & Brand GEO Schema added to layout.tsx.");
} else {
  console.log("ld+json already exists in layout.tsx");
}
