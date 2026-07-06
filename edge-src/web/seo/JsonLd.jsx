import React from "react";

/**
 * Renders a <script type="application/ld+json"> block from seo.jsonLd (a
 * plain JS object/array built by buildSeo.js). No user HTML should ever be
 * inside jsonLd values (descriptions are pre-stripped via
 * htmlMetaDescription), but as defense in depth against script-tag breakout
 * we still escape "</" to "<\/" - a standard, safe way to embed arbitrary
 * JSON inside an inline <script> tag.
 */
export default function JsonLd({seo}) {
  if (!seo || !seo.jsonLd) {
    return null;
  }

  const json = JSON.stringify(seo.jsonLd).replace(/<\//g, "<\\/");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html: json}} />;
}
