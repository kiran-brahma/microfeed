import {getFieldDefs, getRssKind, getType, isAggregator, listTypes} from "./ContentTypeRegistry";

const SEO_TYPES = ["podcast_episode", "blog_article", "photo", "gallery", "landing_page"];

const SEO_FIELD_EXPECTATIONS = [
  {key: "seo_title", kind: "text", target: "seoTitle", source: "seoTitle"},
  {key: "seo_description", kind: "text", target: "seoDescription", source: "seoDescription"},
  {key: "share_image", kind: "image", target: "shareImage", source: "shareImage"},
  {key: "noindex", kind: "boolean", target: "noindex", source: "noindex"},
];

describe("ContentTypeRegistry", () => {
  test("declares the five built-in types", () => {
    expect(listTypes().map((type) => type.name)).toEqual([
      "podcast_episode",
      "blog_article",
      "photo",
      "gallery",
      "landing_page",
    ]);
  });

  test("exposes type families and field definitions", () => {
    expect(getType("podcast_episode")).toMatchObject({
      name: "podcast_episode",
      family: "record",
    });
    expect(getType("gallery")).toMatchObject({
      name: "gallery",
      family: "aggregator",
    });
    expect(isAggregator("gallery")).toBe(true);
    expect(isAggregator("photo")).toBe(false);

    expect(getFieldDefs("podcast_episode").map((field) => field.key)).toEqual([
      "status",
      "title",
      "url",
      "content_html",
      "image",
      "attachment",
      "date_published_ms",
      "guid",
      "itunes:title",
      "itunes:block",
      "itunes:episodeType",
      "itunes:season",
      "itunes:episode",
      "itunes:explicit",
      "seo_title",
      "seo_description",
      "share_image",
      "noindex",
    ]);

    // podcast: url and content_html map to the legacy internal keys link/description
    expect(getFieldDefs("podcast_episode").find((field) => field.key === "url").feedMapping.target).toBe("link");
    expect(getFieldDefs("podcast_episode").find((field) => field.key === "content_html").feedMapping.target).toBe("description");

    expect(getFieldDefs("blog_article").map((field) => field.key)).toEqual([
      "status",
      "title",
      "content_html",
      "image",
      "excerpt",
      "author",
      "tags",
      "date_published_ms",
      "seo_title",
      "seo_description",
      "share_image",
      "noindex",
    ]);

    expect(getFieldDefs("photo").map((field) => field.key)).toEqual([
      "status",
      "title",
      "image",
      "caption",
      "tags",
      "taken_date",
      "seo_title",
      "seo_description",
      "share_image",
      "noindex",
    ]);

    expect(getFieldDefs("photo").find((field) => field.key === "image")).toMatchObject({
      kind: "image",
      required: true,
    });

    expect(getFieldDefs("landing_page").find((field) => field.key === "content_types")).toMatchObject({
      kind: "enum",
      multiple: true,
    });

    expect(getFieldDefs("landing_page").map((field) => field.key)).toEqual([
      "status",
      "title",
      "content_html",
      "image",
      "content_types",
      "filter_tags",
      "sort",
      "limit",
      "layout",
      "show_in_nav",
      "date_published_ms",
      "seo_title",
      "seo_description",
      "share_image",
      "noindex",
    ]);

    expect(getFieldDefs("landing_page").find((field) => field.key === "filter_tags")).toMatchObject({
      kind: "string_list",
    });

    // show_in_nav: boolean fieldDef controlling whether a published landing
    // page appears as its own top-level nav link (PRD_AGGREGATOR_NAV 4.1).
    expect(getFieldDefs("landing_page").find((field) => field.key === "show_in_nav")).toMatchObject({
      kind: "boolean",
      feedMapping: {
        source: "showInNav",
        target: "showInNav",
      },
    });

    // Other types are unchanged: no show_in_nav field leaks onto them.
    expect(getFieldDefs("podcast_episode").some((field) => field.key === "show_in_nav")).toBe(false);
    expect(getFieldDefs("blog_article").some((field) => field.key === "show_in_nav")).toBe(false);
    expect(getFieldDefs("photo").some((field) => field.key === "show_in_nav")).toBe(false);
    expect(getFieldDefs("gallery").some((field) => field.key === "show_in_nav")).toBe(false);

    // landing_page's filter fields must not be relational: no tags/reference field kinds.
    expect(
      getFieldDefs("landing_page").some((field) => field.kind === "tags" || field.kind === "reference"),
    ).toBe(false);
  });

  test("throws for unknown types", () => {
    expect(() => getType("unknown")).toThrow(/unknown content type/i);
    expect(() => getFieldDefs("unknown")).toThrow(/unknown content type/i);
    expect(() => isAggregator("unknown")).toThrow(/unknown content type/i);
  });

  test("declares per-type rss kind and round-trips it through cloneTypeDef", () => {
    expect(getType("podcast_episode").rss).toBe("itunes");
    expect(getType("blog_article").rss).toBe("basic");
    expect(getType("photo").rss).toBeUndefined();
    expect(getType("gallery").rss).toBeUndefined();
    expect(getType("landing_page").rss).toBeUndefined();

    expect(getRssKind("podcast_episode")).toBe("itunes");
    expect(getRssKind("blog_article")).toBe("basic");
    expect(getRssKind("photo")).toBeNull();
    expect(getRssKind("gallery")).toBeNull();
    expect(getRssKind("landing_page")).toBeNull();
    expect(() => getRssKind("unknown")).toThrow(/unknown content type/i);

    // listTypes() carries the rss field through too.
    const listed = listTypes();
    expect(listed.find((t) => t.name === "podcast_episode").rss).toBe("itunes");
    expect(listed.find((t) => t.name === "blog_article").rss).toBe("basic");
  });

  describe("per-item SEO fields (PRD_SEO_GEO 3.2)", () => {
    test.each(SEO_TYPES)("%s declares seo_title, seo_description, share_image, noindex", (typeName) => {
      const fieldDefs = getFieldDefs(typeName);

      SEO_FIELD_EXPECTATIONS.forEach(({key, kind, target, source}) => {
        const fieldDef = fieldDefs.find((field) => field.key === key);
        expect(fieldDef).toBeDefined();
        expect(fieldDef.kind).toBe(kind);
        expect(fieldDef.feedMapping.target).toBe(target);
        expect(fieldDef.feedMapping.source).toBe(source);
        expect(fieldDef.required).toBe(false);
      });
    });

    test("gallery field keys end with the four SEO fields, existing fields unchanged", () => {
      expect(getFieldDefs("gallery").map((field) => field.key)).toEqual([
        "status",
        "title",
        "content_html",
        "image",
        "members",
        "tags",
        "date_published_ms",
        "seo_title",
        "seo_description",
        "share_image",
        "noindex",
      ]);
    });

    test("SEO field defs are independent per type (mutating one type's fieldDefs doesn't leak)", () => {
      const blogSeoTitle = getFieldDefs("blog_article").find((field) => field.key === "seo_title");
      blogSeoTitle.label = "mutated";

      const photoSeoTitle = getFieldDefs("photo").find((field) => field.key === "seo_title");
      expect(photoSeoTitle.label).not.toBe("mutated");
    });
  });
});
