import React from "react";
import RecordPageLayout from "./RecordPageLayout";
import ItemCard from "./ItemCard";
import {htmlMetaDescription} from "../../common-src/StringUtils";

export default function HomePage({channel, items, canonicalUrl, navTypes, seo}) {
  const title = channel.title || "";
  const description = htmlMetaDescription(channel.description || "", false);
  const entries = items || [];

  return (
    <RecordPageLayout
      title={title}
      description={description}
      canonicalUrl={canonicalUrl}
      channel={channel}
      navTypes={navTypes}
      seo={seo}
    >
      <div className="home-hero">
        {channel.image && <img className="home-hero__banner" src={channel.image} alt={title} />}
        <h1 className="home-hero__title">{title}</h1>
        {channel.description && <p className="home-hero__description">{channel.description}</p>}
      </div>
      <div className="item-feed">
        {entries.map((entry) => (
          <ItemCard key={`${entry.content_type}-${entry.slug}`} item={entry} />
        ))}
      </div>
    </RecordPageLayout>
  );
}
