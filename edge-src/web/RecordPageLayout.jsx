import React from "react";

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
  }
`;

export default function RecordPageLayout({title, description, canonicalUrl, children}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <style dangerouslySetInnerHTML={{__html: INLINE_STYLES}} />
      </head>
      <body>
        <main className="record-page">
          {children}
        </main>
      </body>
    </html>
  );
}
