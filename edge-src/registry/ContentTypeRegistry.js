const STATUS_OPTIONS = ["published", "unlisted", "unpublished"];
const PODCAST_EPISODE_TYPE_OPTIONS = ["full", "trailer", "bonus"];
const CONTENT_TYPE_OPTIONS = ["podcast_episode", "blog_article", "photo"];
const SORT_OPTIONS = ["newest_first", "oldest_first"];
const LAYOUT_OPTIONS = ["list", "grid"];

function makeFieldDef(key, kind, extra = {}) {
  return {
    key,
    kind,
    required: false,
    feedMapping: {
      source: extra.source || key,
      target: extra.target || key,
    },
    ...extra,
  };
}

const STATUS_ENUM_EXTRA = {
  options: STATUS_OPTIONS,
  valueMap: {
    published: 1,
    unpublished: 2,
    unlisted: 4,
  },
};

const TYPE_DEFINITIONS = [
  {
    name: "podcast_episode",
    family: "record",
    fieldDefs: [
      makeFieldDef("status", "enum", {...STATUS_ENUM_EXTRA}),
      makeFieldDef("title", "text", {required: true}),
      makeFieldDef("url", "url", {target: "link"}),
      makeFieldDef("content_html", "richtext", {target: "description"}),
      makeFieldDef("image", "image"),
      makeFieldDef("attachment", "media", {target: "mediaFile"}),
      makeFieldDef("date_published_ms", "date", {target: "pubDateMs"}),
      makeFieldDef("guid", "text"),
      makeFieldDef("itunes:title", "text", {
        source: ["_microfeed", "itunes:title"],
        target: "itunes:title",
      }),
      makeFieldDef("itunes:block", "boolean", {
        source: ["_microfeed", "itunes:block"],
        target: "itunes:block",
      }),
      makeFieldDef("itunes:episodeType", "enum", {
        source: ["_microfeed", "itunes:episodeType"],
        target: "itunes:episodeType",
        options: PODCAST_EPISODE_TYPE_OPTIONS,
      }),
      makeFieldDef("itunes:season", "number", {
        source: ["_microfeed", "itunes:season"],
        target: "itunes:season",
        integer: true,
        min: 1,
      }),
      makeFieldDef("itunes:episode", "number", {
        source: ["_microfeed", "itunes:episode"],
        target: "itunes:episode",
        integer: true,
        min: 1,
      }),
      makeFieldDef("itunes:explicit", "boolean", {
        source: ["_microfeed", "itunes:explicit"],
        target: "itunes:explicit",
      }),
    ],
  },
  {
    name: "blog_article",
    family: "record",
    fieldDefs: [
      makeFieldDef("status", "enum", {...STATUS_ENUM_EXTRA}),
      makeFieldDef("title", "text", {required: true}),
      makeFieldDef("content_html", "richtext", {required: true, target: "description"}),
      makeFieldDef("image", "image"),
      makeFieldDef("excerpt", "text"),
      makeFieldDef("author", "text"),
      makeFieldDef("tags", "tags"),
      makeFieldDef("date_published_ms", "date", {target: "pubDateMs"}),
    ],
  },
  {
    name: "photo",
    family: "record",
    fieldDefs: [
      makeFieldDef("status", "enum", {...STATUS_ENUM_EXTRA}),
      makeFieldDef("title", "text"),
      makeFieldDef("image", "image", {required: true}),
      makeFieldDef("caption", "text"),
      makeFieldDef("tags", "tags"),
      makeFieldDef("taken_date", "date", {target: "pubDateMs"}),
    ],
  },
  {
    name: "gallery",
    family: "aggregator",
    fieldDefs: [
      makeFieldDef("status", "enum", {...STATUS_ENUM_EXTRA}),
      makeFieldDef("title", "text", {required: true}),
      makeFieldDef("content_html", "richtext", {target: "description"}),
      makeFieldDef("image", "image"),
      makeFieldDef("members", "reference", {required: true, target: "members"}),
      makeFieldDef("tags", "tags"),
    ],
  },
  {
    name: "landing_page",
    family: "aggregator",
    fieldDefs: [
      makeFieldDef("status", "enum", {...STATUS_ENUM_EXTRA}),
      makeFieldDef("title", "text", {required: true}),
      makeFieldDef("content_html", "richtext", {target: "description"}),
      makeFieldDef("image", "image"),
      makeFieldDef("content_types", "enum", {
        multiple: true,
        options: CONTENT_TYPE_OPTIONS,
      }),
      makeFieldDef("tags", "tags"),
      makeFieldDef("sort", "enum", {
        options: SORT_OPTIONS,
      }),
      makeFieldDef("limit", "number", {integer: true, min: 1}),
      makeFieldDef("layout", "enum", {
        options: LAYOUT_OPTIONS,
      }),
    ],
  },
];

function cloneFieldDef(fieldDef) {
  return {
    ...fieldDef,
    feedMapping: {
      ...fieldDef.feedMapping,
    },
    options: fieldDef.options ? [...fieldDef.options] : undefined,
    valueMap: fieldDef.valueMap ? {...fieldDef.valueMap} : undefined,
  };
}

function cloneTypeDef(typeDef) {
  return {
    ...typeDef,
    fieldDefs: typeDef.fieldDefs.map(cloneFieldDef),
  };
}

export function getType(typeName) {
  const typeDef = TYPE_DEFINITIONS.find((candidate) => candidate.name === typeName);
  if (!typeDef) {
    throw new Error(`Unknown content type: ${typeName}`);
  }
  return cloneTypeDef(typeDef);
}

export function listTypes() {
  return TYPE_DEFINITIONS.map(cloneTypeDef);
}

export function getFieldDefs(typeName) {
  return getType(typeName).fieldDefs;
}

export function isAggregator(typeName) {
  return getType(typeName).family === "aggregator";
}

export {TYPE_DEFINITIONS};

export default {
  getType,
  listTypes,
  getFieldDefs,
  isAggregator,
  TYPE_DEFINITIONS,
};
