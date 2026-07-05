import React from "react";
import RecordPageLayout from "./RecordPageLayout";
import {htmlMetaDescription} from "../../common-src/StringUtils";
import {itemPublicUrl} from "./itemPublicUrl";

function itemTitle(entry) {
  return entry.title || entry.caption || entry.excerpt || entry.slug;
}

export default function HomePage({channel, items, canonicalUrl}) {
  const title = channel.title || "";
  const description = htmlMetaDescription(channel.description || "", false);
  const entries = items || [];

  return (
    <RecordPageLayout title={title} description={description} canonicalUrl={canonicalUrl}>
      <h1 className="record-page__title">{title}</h1>
      {channel.description && <p className="record-page__meta">{channel.description}</p>}
      <ul className="home-page__list">
        {entries.map((entry) => (
          <li key={`${entry.content_type}-${entry.slug}`} className="home-page__entry">
            <a href={itemPublicUrl(entry.content_type, entry.slug)}>
              <span className="home-page__entry-title">{itemTitle(entry)}</span>
            </a>
          </li>
        ))}
      </ul>
      <style dangerouslySetInnerHTML={{__html: `
        .home-page__list {
          list-style: none;
          padding: 0;
          margin: 1.5rem 0 0;
        }
        .home-page__entry {
          padding: 0.75rem 0;
          border-bottom: 1px solid #e5e5e5;
        }
        .home-page__entry a {
          color: inherit;
          text-decoration: none;
          font-size: 1.1rem;
        }
        @media (prefers-color-scheme: dark) {
          .home-page__entry {
            border-bottom-color: #2a2a2a;
          }
        }
      `}} />
    </RecordPageLayout>
  );
}
