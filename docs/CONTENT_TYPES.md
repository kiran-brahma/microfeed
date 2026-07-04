# Content Type catalog — authoritative spec

> Source of truth for the registry (`edge-src/registry/ContentTypeRegistry.js`). Mirrors master PRD (GitHub issue #1). Kept in-repo so offline implementation sessions have it. If this and issue #1 disagree, issue #1 wins — update this file.

## Conventions
- **key** = public API / form field name (what payloads use).
- **target** = internal-schema key written to the item `data` blob (what feeds read). Legacy podcast targets are preserved so the podcast feed keeps working (`description`, `link`, `mediaFile`, `pubDateMs`, `image`, `itunes:*`).
- `status` is an `enum` on every type with valueMap `{published:1, unpublished:2, unlisted:4}`.
- Field kinds: text, richtext, media, image, boolean, number, date, enum, url, tags, reference.

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
| tags | tags | – | tags |
| sort | enum(newest_first,oldest_first) | – | sort |
| limit | number(int,≥1) | – | limit |
| layout | enum(list,grid) | – | layout |

## Corrections from the first Phase 2 pass (offline drift)
- Podcast `url`→**link** and `content_html`→**description** targets (were mapping to `url`/`content_html`).
- Added blog `author`, `excerpt`; photo `caption`, `taken_date`.
- Removed extraneous `url` from blog/photo/gallery/landing.
- Photo now uses `caption` + `taken_date` (not `content_html`/`date_published_ms`).
