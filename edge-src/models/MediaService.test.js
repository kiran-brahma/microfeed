import MediaService from "./MediaService";
import MediaRepo from "./MediaRepo";
import ItemRepo from "./ItemRepo";
import ChannelRepo from "./ChannelRepo";
import SettingsRepo from "./SettingsRepo";
import {STATUSES} from "../../common-src/Constants";

const {createMigratedInMemoryDatabase} = require("../../test-utils/d1-substitute");

function makeService(db, mediaStore = null) {
  const mediaRepo = new MediaRepo(db);
  const itemRepo = new ItemRepo(db);
  const channelRepo = new ChannelRepo(db);
  const settingsRepo = new SettingsRepo(db);
  const store = mediaStore || {
    deleteObject: jest.fn().mockResolvedValue(undefined),
    listObjects: jest.fn().mockResolvedValue([]),
  };
  return {
    mediaRepo,
    itemRepo,
    channelRepo,
    settingsRepo,
    mediaStore: store,
    service: new MediaService({mediaRepo, itemRepo, channelRepo, settingsRepo}, store),
  };
}

async function insertItem(db, {id, slug, data}) {
  await db.prepare(
    "INSERT INTO items (id, status, data, content_type, slug, pub_date) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(id, STATUSES.PUBLISHED, data, "blog_article", slug, new Date().toISOString()).run();
}

describe("MediaService", () => {
  describe("registerUpload dedup", () => {
    test("returns existing url and does not insert a new row on content-hash hit", async () => {
      const db = createMigratedInMemoryDatabase();
      const {service, mediaRepo} = makeService(db);
      try {
        const first = await service.registerUpload({
          hash: "hash-abc",
          key: "proj/prod/images/first.png",
          url: "proj/prod/images/first.png",
          size: 100,
          contentType: "image/png",
        });
        expect(first.deduped).toBe(false);

        const second = await service.registerUpload({
          hash: "hash-abc",
          key: "proj/prod/images/second.png",
          url: "proj/prod/images/second.png",
          size: 200,
          contentType: "image/png",
        });
        expect(second.deduped).toBe(true);
        expect(second.url).toBe("proj/prod/images/first.png");
        expect(second.id).toBe(first.id);

        const all = (await mediaRepo.listAll()).results;
        expect(all).toHaveLength(1);
      } finally {
        db.close();
      }
    });

    test("inserts a new row for a new content hash", async () => {
      const db = createMigratedInMemoryDatabase();
      const {service, mediaRepo} = makeService(db);
      try {
        await service.registerUpload({
          hash: "hash-1",
          key: "proj/prod/images/a.png",
          url: "proj/prod/images/a.png",
        });
        await service.registerUpload({
          hash: "hash-2",
          key: "proj/prod/images/b.png",
          url: "proj/prod/images/b.png",
        });
        const all = (await mediaRepo.listAll()).results;
        expect(all).toHaveLength(2);
      } finally {
        db.close();
      }
    });
  });

  describe("computeUsage", () => {
    test("marks item, rich-text HTML, channel and settings references as used and orphans as unused", async () => {
      const db = createMigratedInMemoryDatabase();
      const {service} = makeService(db);
      try {
        const coverUrl = "proj/prod/images/cover.png";
        const richUrl = "proj/prod/images/inline.png";
        const channelUrl = "proj/prod/images/channel-logo.png";
        const settingsUrl = "proj/prod/images/favicon.png";
        const orphanUrl = "proj/prod/images/orphan.png";

        await service.registerUpload({hash: "h1", key: coverUrl, url: coverUrl});
        await service.registerUpload({hash: "h2", key: richUrl, url: richUrl});
        await service.registerUpload({hash: "h3", key: channelUrl, url: channelUrl});
        await service.registerUpload({hash: "h4", key: settingsUrl, url: settingsUrl});
        await service.registerUpload({hash: "h5", key: orphanUrl, url: orphanUrl});

        await insertItem(db, {
          id: "item_cover1",
          slug: "cover-item",
          data: JSON.stringify({title: "Cover Item", image: coverUrl}),
        });
        await insertItem(db, {
          id: "item_rich01",
          slug: "rich-item",
          data: JSON.stringify({
            title: "Rich Item",
            description: `<p>Hello <img src="${richUrl}" /></p>`,
          }),
        });

        await db.prepare(
          "INSERT INTO channels (id, status, is_primary, data) VALUES (?, ?, ?, ?)",
        ).bind("channel_1", STATUSES.PUBLISHED, 1, JSON.stringify({title: "My Channel", image: channelUrl})).run();

        await db.prepare(
          "INSERT INTO settings (category, data) VALUES (?, ?)",
        ).bind("webGlobalSettings", JSON.stringify({favicon: settingsUrl})).run();

        const usage = await service.computeUsage();
        const byUrl = new Map(usage.map((row) => [row.url, row]));

        expect(byUrl.get(coverUrl).used).toBe(true);
        expect(byUrl.get(coverUrl).references[0]).toMatchObject({type: "item", id: "item_cover1"});

        expect(byUrl.get(richUrl).used).toBe(true);
        expect(byUrl.get(richUrl).references[0]).toMatchObject({type: "item", id: "item_rich01"});

        expect(byUrl.get(channelUrl).used).toBe(true);
        expect(byUrl.get(channelUrl).references[0]).toMatchObject({type: "channel"});

        expect(byUrl.get(settingsUrl).used).toBe(true);
        expect(byUrl.get(settingsUrl).references[0]).toMatchObject({type: "settings", id: "webGlobalSettings"});

        expect(byUrl.get(orphanUrl).used).toBe(false);
        expect(byUrl.get(orphanUrl).references).toHaveLength(0);
      } finally {
        db.close();
      }
    });
  });

  describe("reconcileFromR2", () => {
    test("backfills bucket objects missing from the inventory", async () => {
      const db = createMigratedInMemoryDatabase();
      const store = {
        deleteObject: jest.fn().mockResolvedValue(undefined),
        listObjects: jest.fn().mockResolvedValue([
          {key: "proj/prod/images/existing.png", size: 10, lastModified: null},
          {key: "proj/prod/images/new-1.png", size: 20, lastModified: null},
          {key: "proj/prod/images/new-2.png", size: 30, lastModified: null},
        ]),
      };
      const {service, mediaRepo} = makeService(db, store);
      try {
        await service.registerUpload({
          hash: "h-existing",
          key: "proj/prod/images/existing.png",
          url: "proj/prod/images/existing.png",
        });

        const result = await service.reconcileFromR2();
        expect(result.added.map((r) => r.r2_key).sort()).toEqual([
          "proj/prod/images/new-1.png",
          "proj/prod/images/new-2.png",
        ]);

        const all = (await mediaRepo.listAll()).results;
        expect(all).toHaveLength(3);
      } finally {
        db.close();
      }
    });
  });

  describe("deleteUnused", () => {
    test("refuses a used id and deletes an unused id (removing the row and the R2 object)", async () => {
      const db = createMigratedInMemoryDatabase();
      const {service, mediaRepo, mediaStore} = makeService(db);
      try {
        const usedUrl = "proj/prod/images/used.png";
        const unusedUrl = "proj/prod/images/unused.png";
        const used = await service.registerUpload({hash: "hu", key: usedUrl, url: usedUrl});
        const unused = await service.registerUpload({hash: "hn", key: unusedUrl, url: unusedUrl});

        await insertItem(db, {
          id: "item_uses01",
          slug: "uses-image",
          data: JSON.stringify({title: "Uses", image: usedUrl}),
        });

        const result = await service.deleteUnused([used.id, unused.id]);

        expect(result.refused).toEqual([{id: used.id, reason: "used"}]);
        expect(result.deleted).toEqual([unused.id]);

        expect(mediaStore.deleteObject).toHaveBeenCalledTimes(1);
        expect(mediaStore.deleteObject).toHaveBeenCalledWith(unusedUrl);

        expect(await mediaRepo.getById(used.id)).toBeTruthy();
        expect(await mediaRepo.getById(unused.id)).toBeNull();
      } finally {
        db.close();
      }
    });
  });

  describe("title + slug metadata", () => {
    test("derives a title and unique slug from the original filename on register", async () => {
      const db = createMigratedInMemoryDatabase();
      const {service, mediaRepo} = makeService(db);
      try {
        const a = await service.registerUpload({
          hash: "h1",
          key: "proj/prod/images/item-1.png",
          url: "proj/prod/images/item-1.png",
          originalFilename: "My Sunset Photo.png",
        });
        expect(a.title).toBe("My Sunset Photo");
        expect(a.slug).toBe("my-sunset-photo");

        // A second upload with the same original name gets a de-duplicated slug.
        const b = await service.registerUpload({
          hash: "h2",
          key: "proj/prod/images/item-2.png",
          url: "proj/prod/images/item-2.png",
          originalFilename: "My Sunset Photo.png",
        });
        expect(b.slug).toBe("my-sunset-photo-2");

        const rowA = await mediaRepo.getById(a.id);
        expect(rowA.original_filename).toBe("My Sunset Photo.png");
      } finally {
        db.close();
      }
    });

    test("updateMeta renames title and re-slugs, keeping slugs unique", async () => {
      const db = createMigratedInMemoryDatabase();
      const {service, mediaRepo} = makeService(db);
      try {
        const a = await service.registerUpload({hash: "h1", key: "k/a.png", url: "k/a.png", originalFilename: "a.png"});
        await service.registerUpload({hash: "h2", key: "k/b.png", url: "k/b.png", originalFilename: "b.png"});

        const res = await service.updateMeta(a.id, {title: "Beautiful Beach"});
        expect(res.title).toBe("Beautiful Beach");
        expect(res.slug).toBe("beautiful-beach");
        const row = await mediaRepo.getById(a.id);
        expect(row.title).toBe("Beautiful Beach");
        expect(row.slug).toBe("beautiful-beach");

        // Renaming to collide with an existing slug appends a suffix.
        const res2 = await service.updateMeta(a.id, {title: "b"});
        expect(res2.slug).toBe("b-2");
      } finally {
        db.close();
      }
    });

    test("updateMeta returns an error for an unknown id", async () => {
      const db = createMigratedInMemoryDatabase();
      const {service} = makeService(db);
      try {
        const res = await service.updateMeta("nope", {title: "x"});
        expect(res.error).toBe("not found");
      } finally {
        db.close();
      }
    });
  });

  describe("reconcileFromR2 metadata", () => {
    test("derives title, slug and original_filename for backfilled objects", async () => {
      const db = createMigratedInMemoryDatabase();
      const store = {
        deleteObject: jest.fn().mockResolvedValue(undefined),
        listObjects: jest.fn().mockResolvedValue([
          {key: "proj/prod/images/mountain-view.jpg", size: 1234},
        ]),
      };
      const {service, mediaRepo} = makeService(db, store);
      try {
        const result = await service.reconcileFromR2();
        expect(result.added).toHaveLength(1);
        const row = (await mediaRepo.listAll()).results[0];
        expect(row.title).toBe("mountain view");
        expect(row.slug).toBe("mountain-view");
        expect(row.original_filename).toBe("mountain-view.jpg");
      } finally {
        db.close();
      }
    });
  });
});
