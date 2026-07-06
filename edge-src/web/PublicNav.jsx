import React from "react";

// Shared public nav bar rendered inside RecordPageLayout so every public
// page (home, record detail, aggregator, listing) inherits it. Brand links
// home via channel.image (fallback: channel.title text); type links come
// from the navTypes prop, computed once via publicNavTypes.getPublicNavTypes
// so the "which types have content" logic isn't duplicated per route.
export default function PublicNav({channel = {}, navTypes = []}) {
  const title = channel.title || "";

  return (
    <nav className="public-nav">
      <a className="public-nav__brand" href="/">
        {channel.image ? (
          <img className="public-nav__logo" src={channel.image} alt={title} />
        ) : (
          <span className="public-nav__brand-text">{title}</span>
        )}
      </a>
      {navTypes.length > 0 && (
        <ul className="public-nav__links">
          {navTypes.map((entry) => (
            <li key={entry.name}>
              <a href={entry.href}>{entry.label}</a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
