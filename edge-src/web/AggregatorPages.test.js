const {createMigratedInMemoryDatabase} = require("../../test-utils/d1-substitute");
import ContentService from "../models/ContentService";
import ItemRepo from "../models/ItemRepo";
import FeedDb from "../models/FeedDb";

import {onRequestGet as getGallery} from "../../functions/gallery/[slug]/index.jsx";
import {onRequestGet as getLanding} from "../../functions/[slug]/index.jsx";
import {onRequestGet as getHome} from "../../functions/index.jsx";

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

async function setChannelTitle(db, request, title) {
  const feedDb = new FeedDb({FEED_DB: db}, request);
  const content = await feedDb.getContent();
  await feedDb._putChannelToContent({
    ...content.channel,
    title,
  });
}

async function createPhoto(service, itemRepo, title, extra = {}) {
  await service.create("photo", {
    status: "published",
    title,
    image: `https://cdn.example.com/images/${title}.png`,
    ...extra,
  });
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  return itemRepo.getByTypeAndSlug("photo", slug);
}

async function createBlogArticle(service, itemRepo, title, extra = {}) {
  await service.create("blog_article", {
    status: "published",
    title,
    content_html: `<p>${title}</p>`,
    ...extra,
  });
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  return itemRepo.getByTypeAndSlug("blog_article", slug);
}

async function createPodcastEpisode(service, itemRepo, title, extra = {}) {
  await service.create("podcast_episode", {
    status: "published",
    title,
    content_html: `<p>${title}</p>`,
    ...extra,
  });
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  return itemRepo.getByTypeAndSlug("podcast_episode", slug);
}

async function createGallery(service, itemRepo, title, memberIds, extra = {}) {
  await service.create("gallery", {
    status: "published",
    title,
    members: memberIds,
    ...extra,
  });
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  return itemRepo.getByTypeAndSlug("gallery", slug);
}

async function createLandingPage(service, itemRepo, title, extra = {}) {
  await service.create("landing_page", {
    status: "published",
    title,
    ...extra,
  });
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  return itemRepo.getByTypeAndSlug("landing_page", slug);
}

describe("aggregator + home web pages", () => {
  test("gallery with 2 ordered member photos renders 200 with both photos in order, linking to /photo/<slug>", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      const photoA = await createPhoto(service, itemRepo, "Photo Alpha");
      const photoB = await createPhoto(service, itemRepo, "Photo Beta");

      await createGallery(service, itemRepo, "My Gallery", [photoB.id, photoA.id], {
        content_html: "<p>A curated set</p>",
      });

      const request = new Request("https://site.test/gallery/my-gallery");
      const response = await getGallery({params: {slug: "my-gallery"}, env: makeEnv(db), request});

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("My Gallery");
      expect(html).toContain("A curated set");

      const betaIndex = html.indexOf("/photo/photo-beta");
      const alphaIndex = html.indexOf("/photo/photo-alpha");
      expect(betaIndex).toBeGreaterThan(-1);
      expect(alphaIndex).toBeGreaterThan(-1);
      expect(betaIndex).toBeLessThan(alphaIndex);
    } finally {
      db.close();
    }
  });

  test("landing page filtering content_types:['blog_article'] includes matching article and excludes non-matching photo", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      await createBlogArticle(service, itemRepo, "Matching Article");
      await createPhoto(service, itemRepo, "Excluded Photo");

      await createLandingPage(service, itemRepo, "Blog Landing", {
        content_html: "<p>Latest posts</p>",
        content_types: ["blog_article"],
      });

      const request = new Request("https://site.test/blog-landing");
      const response = await getLanding({params: {slug: "blog-landing"}, env: makeEnv(db), request});

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Blog Landing");
      expect(html).toContain("Matching Article");
      expect(html).toContain("/blog/matching-article");
      expect(html).not.toContain("Excluded Photo");
      expect(html).not.toContain("/photo/excluded-photo");
    } finally {
      db.close();
    }
  });

  test("landing page with sort:'oldest_first' and limit:1 respects order and limit", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      const older = await createBlogArticle(service, itemRepo, "Older Post");
      // Ensure distinct pub_date ordering by explicit date_published_ms.
      await itemRepo.update(older.id, {pub_date: new Date(2020, 0, 1).toISOString()});
      const newer = await createBlogArticle(service, itemRepo, "Newer Post");
      await itemRepo.update(newer.id, {pub_date: new Date(2023, 0, 1).toISOString()});

      await createLandingPage(service, itemRepo, "Sorted Landing", {
        content_types: ["blog_article"],
        sort: "oldest_first",
        limit: 1,
      });

      const request = new Request("https://site.test/sorted-landing");
      const response = await getLanding({params: {slug: "sorted-landing"}, env: makeEnv(db), request});

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Older Post");
      expect(html).not.toContain("Newer Post");
    } finally {
      db.close();
    }
  });

  test("home page lists recent published record items of all three record types, excludes unpublished", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      const request = new Request("https://site.test/");
      await setChannelTitle(db, request, "My Test Feed");

      await createPodcastEpisode(service, itemRepo, "Cast Episode");
      await createBlogArticle(service, itemRepo, "Article One");
      await createPhoto(service, itemRepo, "Photo One");

      await service.create("blog_article", {
        status: "unpublished",
        title: "Hidden Article",
        content_html: "<p>Hidden</p>",
      });

      const response = await getHome({params: {}, env: makeEnv(db), request});

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("My Test Feed");
      expect(html).toContain("Cast Episode");
      expect(html).toContain("/i/cast-episode");
      expect(html).toContain("Article One");
      expect(html).toContain("/blog/article-one");
      expect(html).toContain("Photo One");
      expect(html).toContain("/photo/photo-one");
      expect(html).not.toContain("Hidden Article");
    } finally {
      db.close();
    }
  });

  test("unknown gallery slug returns 404", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const request = new Request("https://site.test/gallery/does-not-exist");
      const response = await getGallery({params: {slug: "does-not-exist"}, env: makeEnv(db), request});
      expect(response.status).toBe(404);
    } finally {
      db.close();
    }
  });

  test("unknown landing slug returns 404", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const request = new Request("https://site.test/does-not-exist");
      const response = await getLanding({params: {slug: "does-not-exist"}, env: makeEnv(db), request});
      expect(response.status).toBe(404);
    } finally {
      db.close();
    }
  });

  test("UNPUBLISHED gallery returns 404", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      const photo = await createPhoto(service, itemRepo, "Lonely Photo");
      const gallery = await createGallery(service, itemRepo, "Hidden Gallery", [photo.id]);
      await itemRepo.update(gallery.id, {status: 2});

      const request = new Request("https://site.test/gallery/hidden-gallery");
      const response = await getGallery({params: {slug: "hidden-gallery"}, env: makeEnv(db), request});
      expect(response.status).toBe(404);
    } finally {
      db.close();
    }
  });

  test("UNPUBLISHED landing page returns 404", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      const landing = await createLandingPage(service, itemRepo, "Hidden Landing");
      await itemRepo.update(landing.id, {status: 2});

      const request = new Request("https://site.test/hidden-landing");
      const response = await getLanding({params: {slug: "hidden-landing"}, env: makeEnv(db), request});
      expect(response.status).toBe(404);
    } finally {
      db.close();
    }
  });

  test("gallery detail page renders the public nav with the Galleries link", async () => {
    const db = createMigratedInMemoryDatabase();
    try {
      const {itemRepo, service} = makeContentService(db);
      const photo = await createPhoto(service, itemRepo, "Nav Photo");
      await createGallery(service, itemRepo, "Nav Gallery", [photo.id]);

      const request = new Request("https://site.test/gallery/nav-gallery");
      const response = await getGallery({params: {slug: "nav-gallery"}, env: makeEnv(db), request});
      expect(response.status).toBe(200);
      const html = await response.text();
      // A published gallery exists, so the nav must show and include the
      // Galleries listing link on the aggregator detail page.
      expect(html).toContain("public-nav");
      expect(html).toContain('href="/gallery/"');
    } finally {
      db.close();
    }
  });
});
