import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'Mediapartners-Google',
        allow: '/',
      },
      {
        userAgent: 'AdsBot-Google',
        allow: '/',
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      }
    ],
    sitemap: 'https://knowora.in/sitemap.xml',
  };
}
