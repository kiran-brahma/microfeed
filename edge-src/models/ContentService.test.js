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

function makeServiceWithMediaStore(db) {
  const itemRepo = new ItemRepo(db);
  const mediaStore = {
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };
  return {
    itemRepo,
    mediaStore,
    service: new ContentService({}, {itemRepo}, {url: "https://example.com/"}, mediaStore),
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

  describe("purge", () => {
    test("purges a soft-deleted podcast item, deleting its media and link rows", async () => {
      const db = createMigratedInMemoryDatabase();
      const {itemRepo, service, mediaStore} = makeServiceWithMediaStore(db);

      try {
        await service.create("podcast_episode", {
          status: "published",
          title: "Episode One",
          content_html: "<p>Body</p>",
          image: "https://cdn.example.com/images/cover-1.png",
          attachment: {
            category: "audio",
            url: "https://cdn.example.com/media/audio-1.mp3",
          },
        });
        const existing = await itemRepo.getByTypeAndSlug("podcast_episode", "episode-one");
        expect(existing).toBeTruthy();

        // Seed link rows directly to prove purge cleans them up.
        const tagRow = {id: "tag00000001", slug: "news", name: "News"};
        db.prepare(
          "INSERT INTO tags (id, slug, name) VALUES (?, ?, ?)",
        ).bind(tagRow.id, tagRow.slug, tagRow.name).run();
        await db.prepare(
          "INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)",
        ).bind(existing.id, tagRow.id).run();

        const otherItemId = await service.create("podcast_episode", {
          status: "published",
          title: "Episode Two",
          content_html: "<p>Other</p>",
        });
        await db.prepare(
          "INSERT INTO item_relations (parent_item_id, child_item_id, rel_type, position) VALUES (?, ?, ?, ?)",
        ).bind(existing.id, otherItemId, "gallery_member", 0).run();

        await service.delete(existing.id);

        const result = await service.purge(existing.id);

        expect(result).toEqual(existing.id);
        expect(await itemRepo.getById(existing.id)).toBeNull();

        expect(mediaStore.deleteObject).toHaveBeenCalledTimes(2);
        const calledKeys = mediaStore.deleteObject.mock.calls.map((call) => call[0]);
        expect(calledKeys).toEqual(expect.arrayContaining([
          "images/cover-1.png",
          "media/audio-1.mp3",
        ]));

        const remainingItemTags = await db.prepare(
          "SELECT * FROM item_tags WHERE item_id = ?",
        ).bind(existing.id).all();
        expect(remainingItemTags.results).toHaveLength(0);

        const remainingRelations = await db.prepare(
          "SELECT * FROM item_relations WHERE parent_item_id = ? OR child_item_id = ?",
        ).bind(existing.id, existing.id).all();
        expect(remainingRelations.results).toHaveLength(0);
      } finally {
        db.close();
      }
    });

    test("purges a soft-deleted photo item, deleting its image", async () => {
      const db = createMigratedInMemoryDatabase();
      const {itemRepo, service, mediaStore} = makeServiceWithMediaStore(db);

      try {
        await service.create("photo", {
          status: "published",
          title: "A Photo",
          image: "https://cdn.example.com/images/photo-1.png",
        });
        const existing = await itemRepo.getByTypeAndSlug("photo", "a-photo");
        await service.delete(existing.id);

        const result = await service.purge(existing.id);

        expect(result).toEqual(existing.id);
        expect(await itemRepo.getById(existing.id)).toBeNull();
        expect(mediaStore.deleteObject).toHaveBeenCalledTimes(1);
        expect(mediaStore.deleteObject).toHaveBeenCalledWith("images/photo-1.png");
      } finally {
        db.close();
      }
    });

    test("purge on a live item without force returns an error and changes nothing", async () => {
      const db = createMigratedInMemoryDatabase();
      const {itemRepo, service, mediaStore} = makeServiceWithMediaStore(db);

      try {
        await service.create("blog_article", {
          status: "published",
          title: "Still Live",
          content_html: "<p>Body</p>",
        });
        const existing = await itemRepo.getByTypeAndSlug("blog_article", "still-live");

        const result = await service.purge(existing.id);

        expect(result).toEqual({
          errors: expect.arrayContaining([
            expect.objectContaining({field: "id", message: "Item must be soft-deleted before purge"}),
          ]),
        });
        expect(await itemRepo.getById(existing.id)).toMatchObject({
          id: existing.id,
          status: STATUSES.PUBLISHED,
        });
        expect(mediaStore.deleteObject).not.toHaveBeenCalled();
      } finally {
        db.close();
      }
    });

    test("purge on a live item with force:true removes it", async () => {
      const db = createMigratedInMemoryDatabase();
      const {itemRepo, service} = makeServiceWithMediaStore(db);

      try {
        await service.create("blog_article", {
          status: "published",
          title: "Force Purge Me",
          content_html: "<p>Body</p>",
        });
        const existing = await itemRepo.getByTypeAndSlug("blog_article", "force-purge-me");

        const result = await service.purge(existing.id, {force: true});

        expect(result).toEqual(existing.id);
        expect(await itemRepo.getById(existing.id)).toBeNull();
      } finally {
        db.close();
      }
    });

    test("purge on a missing id returns a not-found error", async () => {
      const db = createMigratedInMemoryDatabase();
      const {service, mediaStore} = makeServiceWithMediaStore(db);

      try {
        const result = await service.purge("does-not-exist");

        expect(result).toEqual({
          errors: expect.arrayContaining([
            expect.objectContaining({field: "id", message: "Item not found"}),
          ]),
        });
        expect(mediaStore.deleteObject).not.toHaveBeenCalled();
      } finally {
        db.close();
      }
    });
  });
});
