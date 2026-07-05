import {getFieldDefs, getType, isAggregator, listTypes} from "./ContentTypeRegistry";

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
    ]);

    expect(getFieldDefs("photo").map((field) => field.key)).toEqual([
      "status",
      "title",
      "image",
      "caption",
      "tags",
      "taken_date",
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
    ]);

    expect(getFieldDefs("landing_page").find((field) => field.key === "filter_tags")).toMatchObject({
      kind: "string_list",
    });

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
});
