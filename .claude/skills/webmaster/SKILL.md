---
name: webmaster
description: SEO optimization, site health, and web presence management
category: atomic
tools: [Bash, WebSearch, WebFetch, Read, Grep]
---

# Webmaster

## Purpose

Manages SEO, site health, and web presence. Covers Lighthouse audits, meta tag optimization, sitemap verification, analytics setup, and search engine indexing. Use this skill for improving search visibility, fixing site health issues, or setting up a new site's web presence.

## Prerequisites

- Site is deployed and publicly accessible (or accessible via a preview URL)
- Access to DNS management, hosting configuration, or source code for the site
- Google Search Console / Bing Webmaster Tools access (for indexing tasks)

## Workflow

### 1. Site Health Audit

Run a Lighthouse audit or equivalent to check:

| Category | Key Metrics |
|----------|------------|
| **Performance** | LCP < 2.5s, FID < 100ms, CLS < 0.1 |
| **SEO** | Meta tags present, structured data valid, mobile-friendly |
| **Accessibility** | Alt text on images, proper heading hierarchy, sufficient contrast |
| **Best Practices** | HTTPS, no mixed content, no console errors |

```bash
# CLI Lighthouse audit
npx lighthouse https://example.com --output=json --output-path=./audit.json
```

### 2. Meta Tag Optimization

Every page needs at minimum:

```html
<title>Page Title — Site Name</title>
<meta name="description" content="Concise, compelling description under 160 chars">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.com/page">

<!-- Open Graph (social sharing) -->
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Description for social cards">
<meta property="og:image" content="https://example.com/og-image.jpg">
<meta property="og:url" content="https://example.com/page">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
```

### 3. Sitemap and Robots

```xml
<!-- sitemap.xml — list all public pages -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2025-01-15</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>
```

```
# robots.txt
User-agent: *
Allow: /
Sitemap: https://example.com/sitemap.xml
Disallow: /api/
Disallow: /admin/
```

Submit sitemap to Google Search Console and Bing Webmaster Tools after creation.

### 4. Analytics Setup

- Add analytics script (Google Analytics, Plausible, Umami, etc.)
- Verify data is flowing (check real-time view)
- Set up key events: page views, sign-ups, conversions
- Configure referral exclusion for your own domains

### 5. Ongoing Monitoring

- Check Search Console weekly for crawl errors and indexing issues
- Monitor Core Web Vitals monthly
- Review top landing pages and search queries
- Fix 404s by adding redirects for moved/deleted pages

## Examples

**New site launch SEO checklist:**
1. Verify all pages have unique title + description meta tags
2. Create and submit sitemap.xml
3. Set up robots.txt
4. Add structured data (JSON-LD) for organization, articles, products as relevant
5. Verify mobile responsiveness
6. Set up analytics and Search Console

**Fix poor Lighthouse score:**
1. Run Lighthouse, identify worst scores
2. Performance: optimize images (WebP, lazy loading), reduce JS bundle, add caching headers
3. SEO: add missing meta tags, fix heading hierarchy
4. Accessibility: add alt text, fix contrast issues

## Gotchas

- **SPAs need special handling for SEO.** Client-rendered content is often invisible to crawlers. Use SSR, SSG, or prerendering.
- **Meta tags in SPA `<head>` must be set per-route.** A single set of meta tags for all pages defeats the purpose. Use a library like react-helmet or equivalent.
- **Don't stuff keywords.** Write meta descriptions for humans. Search engines penalize keyword stuffing.
- **Lighthouse scores vary between runs.** Run 3 times and take the median. Network conditions, server load, and caching all affect results.
- **Sitemap must stay current.** If you add pages without updating the sitemap, crawlers may not find them. Automate sitemap generation if possible.
