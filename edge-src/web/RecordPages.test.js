const {createMigratedInMemoryDatabase} = require("../../test-utils/d1-substitute");
import ContentService from "../models/ContentService";
import ItemRepo from "../models/ItemRepo";
import FeedDb from "../models/FeedDb";
import {STATUSES} from "../../common-src/Constants";

import {onRequestGet as getBlogArticle} from "../../functions/blog/[slug]/index.jsx";
import {onRequestGet as getPhoto} from "../../functions/photo/[slug]/index.jsx";
import {onRequestGet as getPodcastEpisode} from "../../functions/i/[slug]/index.jsx";

function makeEnv(db) {
  return {FEED_DB: db};
}

function makeContentService(db) {
  const itemRepo = new ItemRepo(db);
  return {
    itemRepo,
    service: new ContentService({}, {itemRepo}, {url: "https://example.com/"}),
  };
}

async function setPublicBucketUrl(db, request, publicBucketUrl) {
  const feedDb = new FeedDb({FEED_DB: db}, request);
  const content = await feedDb.getContent();
  await feedDb._putSettingsToContent({
    ...content.settings,
    webGlobalSettings: {
      ...(content.settings.webGlobalSettings || {}),
      publicBucketUrl,
    },
  });
}

describe("record type web pages", () => {
  test("published blog_article renders 200 with title, content_html body, and tags", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      await service.create("blog_article", {
        status: "published",
        title: "Hello World",
        content_html: "<p>Body copy</p>",
        author: "Ada Lovelace",
      });
      const row = await itemRepo.getByTypeAndSlug("blog_article", "hello-world");
      expect(row).toBeTruthy();

      const request = new Request("https://site.test/blog/hello-world");
      const response = await getBlogArticle({params: {slug: "hello-world"}, env: makeEnv(db), request});

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Hello World");
      expect(html).toContain("<p>Body copy</p>");
      expect(html).toContain("Ada Lovelace");
    } finally {
      db.close();
    }
  });

  test("published podcast_episode renders 200 with an audio element using the absolute attachment url", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      const request = new Request("https://site.test/i/episode-one");
      await setPublicBucketUrl(db, request, "https://cdn.example.com");

      await service.create("podcast_episode", {
        status: "published",
        title: "Episode One",
        content_html: "<p>Show notes</p>",
        attachment: {
          category: "audio",
          url: "https://cdn.example.com/production/ep1.mp3",
          mime_type: "audio/mpeg",
        },
      });
      const row = await itemRepo.getByTypeAndSlug("podcast_episode", "episode-one");
      expect(row).toBeTruthy();

      const response = await getPodcastEpisode({params: {slug: "episode-one"}, env: makeEnv(db), request});

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Episode One");
      expect(html).toContain("<audio");
      expect(html).toContain("https://cdn.example.com/production/ep1.mp3");
    } finally {
      db.close();
    }
  });

  test("published photo renders 200 with image and caption", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      await service.create("photo", {
        status: "published",
        title: "Sunset",
        image: "https://cdn.example.com/production/sunset.png",
        caption: "A beautiful sunset",
      });
      const row = await itemRepo.getByTypeAndSlug("photo", "sunset");
      expect(row).toBeTruthy();

      const request = new Request("https://site.test/photo/sunset");
      const response = await getPhoto({params: {slug: "sunset"}, env: makeEnv(db), request});

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("<img");
      expect(html).toContain("A beautiful sunset");
    } finally {
      db.close();
    }
  });

  test("unknown slug returns 404", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const request = new Request("https://site.test/blog/does-not-exist");
      const response = await getBlogArticle({params: {slug: "does-not-exist"}, env: makeEnv(db), request});
      expect(response.status).toBe(404);
    } finally {
      db.close();
    }
  });

  test("UNPUBLISHED item at a known slug returns 404", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      await service.create("blog_article", {
        status: "unpublished",
        title: "Hidden Post",
        content_html: "<p>Body</p>",
      });
      const row = await itemRepo.getByTypeAndSlug("blog_article", "hidden-post");
      expect(row).toMatchObject({status: STATUSES.UNPUBLISHED});

      const request = new Request("https://site.test/blog/hidden-post");
      const response = await getBlogArticle({params: {slug: "hidden-post"}, env: makeEnv(db), request});
      expect(response.status).toBe(404);
    } finally {
      db.close();
    }
  });

  test("UNLISTED item at a known slug returns 200", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      await service.create("blog_article", {
        status: "unlisted",
        title: "Unlisted Post",
        content_html: "<p>Body</p>",
      });
      const row = await itemRepo.getByTypeAndSlug("blog_article", "unlisted-post");
      expect(row).toMatchObject({status: STATUSES.UNLISTED});

      const request = new Request("https://site.test/blog/unlisted-post");
      const response = await getBlogArticle({params: {slug: "unlisted-post"}, env: makeEnv(db), request});
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Unlisted Post");
    } finally {
      db.close();
    }
  });

  test("detail page renders the public nav populated from published content", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      await service.create("blog_article", {
        status: "published",
        title: "Navigable Post",
        content_html: "<p>Body</p>",
      });
      const row = await itemRepo.getByTypeAndSlug("blog_article", "navigable-post");
      expect(row).toBeTruthy();

      const request = new Request("https://site.test/blog/navigable-post");
      const response = await getBlogArticle({params: {slug: "navigable-post"}, env: makeEnv(db), request});
      expect(response.status).toBe(200);
      const html = await response.text();
      // The shared public nav must appear on record detail pages, and it
      // must be populated with a link to the type's listing (a published
      // blog_article exists, so the "Blog" listing link should show).
      expect(html).toContain("public-nav");
      expect(html).toContain('href="/blog/"');
      // no-referrer meta keeps bucket-hosted cover images from being blocked
      // by Cloudflare hotlink protection when viewed cross-origin.
      expect(html).toContain('name="referrer" content="no-referrer"');
    } finally {
      db.close();
    }
  });
});
