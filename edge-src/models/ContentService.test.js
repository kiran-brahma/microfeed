import ContentService from "./ContentService";
import ItemRepo from "./ItemRepo";
import {STATUSES} from "../../common-src/Constants";

const {createMigratedInMemoryDatabase} = require("../../test-utils/d1-substitute");

function makeService(db) {
  const itemRepo = new ItemRepo(db);
  return {
    itemRepo,
    service: new ContentService({}, {itemRepo}, {url: "https://example.com/"}),
  };
}

describe("ContentService", () => {
  test("create persists typed content with generated slug and mapped internal schema", async () => {
    const db = createMigratedInMemoryDatabase();
    const {itemRepo, service} = makeService(db);

    try {
      await service.create("blog_article", {
        status: "published",
        title: "Hello World",
        content_html: "<p>Body</p>",
        excerpt: "Short teaser",
        author: "Ada Lovelace",
        tags: ["news", "launch"],
        date_published_ms: 1720051200000,
      });

      const row = await itemRepo.getByTypeAndSlug("blog_article", "hello-world");
      expect(row).toMatchObject({
        content_type: "blog_article",
        slug: "hello-world",
        status: STATUSES.PUBLISHED,
        pub_date: "2024-07-04T00:00:00.000Z",
      });
      expect(JSON.parse(row.data)).toEqual({
        title: "Hello World",
        description: "<p>Body</p>",
        excerpt: "Short teaser",
        author: "Ada Lovelace",
        tags: ["news", "launch"],
      });
    } finally {
      db.close();
    }
  });

  test("create returns field errors and writes nothing when validation fails", async () => {
    const db = createMigratedInMemoryDatabase();
    const {itemRepo, service} = makeService(db);

    try {
      const result = await service.create("blog_article", {
        status: "archived",
        title: "",
        content_html: "",
        tags: ["news", ""],
      });

      expect(result).toEqual({
        errors: expect.arrayContaining([
          expect.objectContaining({field: "status"}),
          expect.objectContaining({field: "title"}),
          expect.objectContaining({field: "content_html"}),
          expect.objectContaining({field: "tags"}),
        ]),
      });
      expect((await itemRepo.list()).results).toHaveLength(0);
    } finally {
      db.close();
    }
  });

  test("update merges with existing content and revalidates the full payload", async () => {
    const db = createMigratedInMemoryDatabase();
    const {itemRepo, service} = makeService(db);

    try {
      await service.create("blog_article", {
        status: "published",
        title: "Original Title",
        content_html: "<p>Original body</p>",
        excerpt: "Original teaser",
        author: "Ada",
        tags: ["one", "two"],
        date_published_ms: 1720051200000,
      });

      const existing = await itemRepo.getByTypeAndSlug("blog_article", "original-title");
      expect(existing).toBeTruthy();

      const result = await service.update(existing.id, {
        excerpt: "Updated teaser",
      });

      expect(result).not.toHaveProperty("errors");
      const updated = await itemRepo.getById(existing.id);
      expect(updated).toMatchObject({
        id: existing.id,
        content_type: "blog_article",
        slug: "original-title",
      });
      expect(JSON.parse(updated.data)).toEqual({
        title: "Original Title",
        description: "<p>Original body</p>",
        excerpt: "Updated teaser",
        author: "Ada",
        tags: ["one", "two"],
      });
    } finally {
      db.close();
    }
  });

  test("duplicate generated slugs are rejected for the same content type", async () => {
    const db = createMigratedInMemoryDatabase();
    const {itemRepo, service} = makeService(db);

    try {
      await service.create("blog_article", {
        status: "published",
        title: "Same Title",
        content_html: "<p>One</p>",
      });

      const result = await service.create("blog_article", {
        status: "published",
        title: "Same Title",
        content_html: "<p>Two</p>",
      });

      expect(result).toEqual({
        errors: expect.arrayContaining([
          expect.objectContaining({field: "slug"}),
        ]),
      });
      expect((await itemRepo.list()).results).toHaveLength(1);
    } finally {
      db.close();
    }
  });

  test("delete soft-deletes an item, keeping it retrievable but excluded from active listings", async () => {
    const db = createMigratedInMemoryDatabase();
    const {itemRepo, service} = makeService(db);

    try {
      await service.create("blog_article", {
        status: "published",
        title: "To Be Deleted",
        content_html: "<p>Body</p>",
      });
      const existing = await itemRepo.getByTypeAndSlug("blog_article", "to-be-deleted");

      const result = await service.delete(existing.id);

      expect(result).toEqual(existing.id);
      const row = await itemRepo.getById(existing.id);
      expect(row).toMatchObject({
        id: existing.id,
        status: STATUSES.DELETED,
      });
      const activeResults = await itemRepo.list({
        queryKwargs: {
          "status__!=": STATUSES.DELETED,
        },
      });
      expect(activeResults.results.map((entry) => entry.id)).not.toContain(existing.id);
    } finally {
      db.close();
    }
  });

  test("delete on a missing id returns not-found error and writes nothing", async () => {
    const db = createMigratedInMemoryDatabase();
    const {itemRepo, service} = makeService(db);

    try {
      const result = await service.delete("does-not-exist");

      expect(result).toEqual({
        errors: expect.arrayContaining([
          expect.objectContaining({field: "id", message: "Item not found"}),
        ]),
      });
      expect((await itemRepo.list()).results).toHaveLength(0);
    } finally {
      db.close();
    }
  });

  test("restore sets a soft-deleted item's status to unpublished", async () => {
    const db = createMigratedInMemoryDatabase();
    const {itemRepo, service} = makeService(db);

    try {
      await service.create("blog_article", {
        status: "published",
        title: "To Be Restored",
        content_html: "<p>Body</p>",
      });
      const existing = await itemRepo.getByTypeAndSlug("blog_article", "to-be-restored");
      await service.delete(existing.id);

      const result = await service.restore(existing.id);

      expect(result).toEqual(existing.id);
      const row = await itemRepo.getById(existing.id);
      expect(row).toMatchObject({
        id: existing.id,
        status: STATUSES.UNPUBLISHED,
      });
    } finally {
      db.close();
    }
  });

  test("restore on a non-deleted item returns a not-deleted error and does not change status", async () => {
    const db = createMigratedInMemoryDatabase();
    const {itemRepo, service} = makeService(db);

    try {
      await service.create("blog_article", {
        status: "published",
        title: "Still Live",
        content_html: "<p>Body</p>",
      });
      const existing = await itemRepo.getByTypeAndSlug("blog_article", "still-live");

      const result = await service.restore(existing.id);

      expect(result).toEqual({
        errors: expect.arrayContaining([
          expect.objectContaining({field: "id", message: "Item is not deleted"}),
        ]),
      });
      const row = await itemRepo.getById(existing.id);
      expect(row).toMatchObject({
        id: existing.id,
        status: STATUSES.PUBLISHED,
      });
    } finally {
      db.close();
    }
  });

  test("restore on a missing id returns not-found error", async () => {
    const db = createMigratedInMemoryDatabase();
    const {service} = makeService(db);

    try {
      const result = await service.restore("does-not-exist");

      expect(result).toEqual({
        errors: expect.arrayContaining([
          expect.objectContaining({field: "id", message: "Item not found"}),
        ]),
      });
    } finally {
      db.close();
    }
  });
});
