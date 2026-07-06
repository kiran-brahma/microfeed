import React from "react";
import PublicNav from "./PublicNav";

// Small, self-contained inline stylesheet: system font stack, readable
// max-width container. No external CSS dependencies (Task 6.3a — fixed,
// modern templates that don't rely on Mustache/Theme custom code).
const INLINE_STYLES = `
  :root {
    color-scheme: light dark;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
    background: #ffffff;
  }
  .public-nav {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.85rem 1.25rem;
    background: #ffffff;
    border-bottom: 1px solid #e5e5e5;
  }
  .public-nav__brand {
    display: flex;
    align-items: center;
    color: inherit;
    text-decoration: none;
    font-weight: 600;
    font-size: 1.05rem;
    margin-right: auto;
  }
  .public-nav__logo {
    height: 32px;
    width: auto;
    display: block;
    border-radius: 4px;
  }
  .public-nav__brand-text {
    color: inherit;
  }
  .public-nav__links {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    padding: 0;
    margin: 0;
  }
  .public-nav__links a {
    color: inherit;
    text-decoration: none;
    font-size: 0.95rem;
  }
  .public-nav__links a:hover {
    text-decoration: underline;
  }
  @media (prefers-color-scheme: dark) {
    .public-nav {
      background: #121212;
      border-bottom-color: #2a2a2a;
    }
  }
  .record-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 2.5rem 1.25rem 4rem;
  }
  .record-page__cover {
    width: 100%;
    height: auto;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: block;
  }
  .record-page__title {
    font-size: 2rem;
    line-height: 1.25;
    margin: 0 0 0.5rem;
  }
  .record-page__meta {
    color: #666666;
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
  }
  .record-page__meta a {
    color: inherit;
  }
  .record-page__audio {
    width: 100%;
    margin-bottom: 1.5rem;
  }
  .record-page__body {
    font-size: 1.05rem;
  }
  .record-page__body img {
    max-width: 100%;
    height: auto;
  }
  .record-page__tags {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0;
    margin: 1.5rem 0 0;
  }
  .record-page__tags li {
    background: #f0f0f0;
    color: #333333;
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
  }
  .record-page__caption {
    color: #444444;
    font-size: 1rem;
    margin-top: 1rem;
  }
  .home-hero {
    margin-bottom: 2rem;
  }
  .home-hero__banner {
    width: 100%;
    height: auto;
    max-height: 320px;
    object-fit: cover;
    border-radius: 8px;
    display: block;
    margin-bottom: 1.25rem;
  }
  .home-hero__title {
    font-size: 2.25rem;
    line-height: 1.2;
    margin: 0 0 0.5rem;
  }
  .home-hero__description {
    color: #555555;
    font-size: 1.05rem;
    margin: 0;
  }
  .item-feed {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.5rem;
  }
  .item-card {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    overflow: hidden;
  }
  .item-card__link {
    display: block;
    color: inherit;
    text-decoration: none;
    padding-bottom: 1rem;
  }
  .item-card__image {
    width: 100%;
    height: 160px;
    object-fit: cover;
    display: block;
  }
  .item-card__badge {
    display: inline-block;
    margin: 0.75rem 1rem 0;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    background: #f0f0f0;
    color: #333333;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .item-card__title {
    margin: 0.5rem 1rem 0;
    font-size: 1.1rem;
    line-height: 1.35;
  }
  .item-card__excerpt {
    margin: 0.4rem 1rem 0;
    color: #555555;
    font-size: 0.95rem;
  }
  .listing-page__empty {
    color: #666666;
    padding: 2rem 0;
  }
  .listing-page__pagination {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 2rem;
  }
  .listing-page__pagination a {
    color: inherit;
    text-decoration: none;
    font-weight: 600;
  }
  @media (prefers-color-scheme: dark) {
    body {
      color: #e6e6e6;
      background: #121212;
    }
    .record-page__meta {
      color: #a0a0a0;
    }
    .record-page__tags li {
      background: #2a2a2a;
      color: #dddddd;
    }
    .record-page__caption {
      color: #cccccc;
    }
    .home-hero__description {
      color: #b0b0b0;
    }
    .item-card {
      border-color: #2a2a2a;
    }
    .item-card__badge {
      background: #2a2a2a;
      color: #dddddd;
    }
    .item-card__excerpt {
      color: #b0b0b0;
    }
    .listing-page__empty {
      color: #a0a0a0;
    }
  }
`;

export default function RecordPageLayout({title, description, canonicalUrl, channel, navTypes = [], children}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        {/* Media is served from a bucket domain (e.g. media.<domain>) that has
            Cloudflare hotlink protection on. When the site is viewed from a
            different origin (e.g. *.pages.dev) the cross-origin Referer is
            rejected (HTTP 1011/403) and every image breaks. Suppressing the
            referer makes image requests look direct, which hotlink protection
            allows — so covers work on the bucket's own domain and elsewhere. */}
        <meta name="referrer" content="no-referrer" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <style dangerouslySetInnerHTML={{__html: INLINE_STYLES}} />
      </head>
      <body>
        <PublicNav channel={channel || {}} navTypes={navTypes} />
        <main className="record-page">
          {children}
        </main>
      </body>
    </html>
  );
}
