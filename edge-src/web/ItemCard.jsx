import React from "react";
import {itemPublicUrl} from "./itemPublicUrl";

// Card badge labels (singular: "Blog" / "Photo" / "Podcast" per PRD 4.2).
// Distinct from the plural nav labels in publicNavTypes.js ("Blog" /
// "Photos" / "Podcast") which describe a whole listing/section, not one item.
const BADGE_LABELS = {
  blog_article: "Blog",
  photo: "Photo",
  podcast_episode: "Podcast",
};

function cardTitle(item) {
  return item.title || item.caption || item.excerpt || item.slug;
}

function cardExcerpt(item) {
  if (item.title && item.excerpt) {
    return item.excerpt;
  }
  if (item.title && item.caption) {
    return item.caption;
  }
  if (item.title) {
    return null;
  }
  return null;
}

// Shared card markup consumed by HomePage's feed and TypeListingPage, so
// card presentation lives in exactly one place (PRD 4.4).
export default function ItemCard({item}) {
  const href = itemPublicUrl(item.content_type, item.slug);
  const title = cardTitle(item);
  const excerpt = cardExcerpt(item);
  const badgeLabel = BADGE_LABELS[item.content_type] || item.content_type;

  return (
    <article className="item-card">
      <a className="item-card__link" href={href}>
        {item.image && <img className="item-card__image" src={item.image} alt={title || ""} />}
        <span className="item-card__badge">{badgeLabel}</span>
        <h3 className="item-card__title">{title}</h3>
        {excerpt && <p className="item-card__excerpt">{excerpt}</p>}
      </a>
    </article>
  );
}
