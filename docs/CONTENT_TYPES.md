# Content Type catalog — authoritative spec

> **Canonical source of truth for field names** for the registry (`edge-src/registry/ContentTypeRegistry.js`) and all consumers (mapper, validation, CRUD, feeds, admin forms, OpenAPI). Kept in-repo so offline sessions have it.
>
> **Naming decision (2026-07, blessed):** the implemented field keys here are the legacy microfeed public-API names (`content_html`, `url`, `date_published_ms`, `image`, `_microfeed.itunes:*`, flat `filter_tags`/`content_types`/`sort`/`limit`). The master-PRD draft (GitHub issue #1) used aspirational names (`body`, `link`, `pub_date`, `cover_image`, `intro`, nested `filter{}`, flat `itunes_*`). **These implemented names are authoritative — this file wins over the issue #1 draft** (see issue #1 comment recording the decision). Reason: legacy-API compatibility, internal consistency, and no external consumers require the cosmetic rename.

## Conventions
- **key** = public API / form field name (what payloads use).
- **target** = internal-schema key written to the item `data` blob (what feeds read). Legacy podcast targets are preserved so the podcast feed keeps working (`description`, `link`, `mediaFile`, `pubDateMs`, `image`, `itunes:*`).
- `status` is an `enum` on every type with valueMap `{published:1, unpublished:2, unlisted:4}`.
- Field kinds: text, richtext, media, image, boolean, number, date, enum, url, tags, reference, string_list.
- **rss** = optional per-type RSS flavor exposed by the registry (`getRssKind(typeName)` → `"itunes" | "basic" | null`), consumed by `FeedPublicRssBuilder`:
  - `podcast_episode` → `"itunes"` — full iTunes-tagged RSS 2.0 item (`itunes:*`, `<enclosure>`).
  - `blog_article` → `"basic"` — plain RSS 2.0 item (title/link/description/guid/pubDate only, no iTunes tags, no enclosure).
  - `photo`, `gallery`, `landing_page` → no `rss` key → `getRssKind` returns `null` → excluded from RSS entirely.

## podcast_episode (record) — feeds: JSON + iTunes RSS + web `/i/[slug]`
| key | kind | required | target |
|---|---|---|---|
| status | enum | – | status |
| title | text | ✅ | title |
| url | url | – | **link** |
| content_html | richtext | – | **description** |
| image | image | – | image |
| attachment | media | – | mediaFile |
| date_published_ms | date | – | pubDateMs |
| guid | text | – | guid |
| itunes:title | text | – | itunes:title (source `_microfeed.itunes:title`) |
| itunes:block | boolean | – | itunes:block (source `_microfeed.*`) |
| itunes:episodeType | enum(full,trailer,bonus) | – | itunes:episodeType (source `_microfeed.*`) |
| itunes:season | number(int,≥1) | – | itunes:season (source `_microfeed.*`) |
| itunes:episode | number(int,≥1) | – | itunes:episode (source `_microfeed.*`) |
| itunes:explicit | boolean | – | itunes:explicit (source `_microfeed.*`) |

## blog_article (record) — feeds: JSON + blog RSS `/blog/rss` + web `/blog/[slug]`
| key | kind | required | target |
|---|---|---|---|
| status | enum | – | status |
| title | text | ✅ | title |
| content_html | richtext | ✅ | description |
| image | image | – | image (cover) |
| excerpt | text | – | excerpt |
| author | text | – | author |
| tags | tags | – | tags |
| date_published_ms | date | – | pubDateMs |

## photo (record) — feeds: JSON + web `/photo/[slug]`
| key | kind | required | target |
|---|---|---|---|
| status | enum | – | status |
| title | text | – | title |
| image | image | ✅ | image |
| caption | text | – | caption |
| tags | tags | – | tags |
| taken_date | date | – | pubDateMs |

## gallery (aggregator, explicit ordered Photos) — feeds: JSON + web `/gallery/[slug]`
| key | kind | required | target |
|---|---|---|---|
| status | enum | – | status |
| title | text | ✅ | title |
| content_html | richtext | – | description |
| image | image | – | image (cover) |
| members | reference | ✅ | members |
| tags | tags | – | tags |

## landing_page (aggregator, dynamic filter) — feeds: web `/[slug]` + JSON
| key | kind | required | target |
|---|---|---|---|
| status | enum | – | status |
| title | text | ✅ | title |
| content_html | richtext | – | description (intro) |
| image | image | – | image |
| content_types | enum(multiple; podcast_episode,blog_article,photo) | – | content_types |
| filter_tags | string_list | – | filter_tags |
| sort | enum(newest_first,oldest_first) | – | sort |
| limit | number(int,≥1) | – | limit |
| layout | enum(list,grid) | – | layout |

> `filter_tags` is a plain string list (kind `string_list`), not the relational `tags` field kind — it's filter *config* stored in the item's own `data` blob, not a tag link on the landing page item itself. This keeps `landing_page` free of any `tags`/`reference` field kind, so `ContentService` never creates relational side effects (item_tags/item_relations rows) for it.

## Corrections from the first Phase 2 pass (offline drift)
- Podcast `url`→**link** and `content_html`→**description** targets (were mapping to `url`/`content_html`).
- Added blog `author`, `excerpt`; photo `caption`, `taken_date`.
- Removed extraneous `url` from blog/photo/gallery/landing.
- Photo now uses `caption` + `taken_date` (not `content_html`/`date_published_ms`).
