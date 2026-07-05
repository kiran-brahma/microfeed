import RelationRepo, {GALLERY_MEMBER} from "./RelationRepo";

const {createMigratedInMemoryDatabase} = require("../../test-utils/d1-substitute");

async function seedItem(db, id, contentType = "photo") {
  await db.prepare(
    "INSERT INTO items (id, status, content_type, slug, data) VALUES (?, ?, ?, ?, ?)",
  ).bind(id, 1, contentType, id, "{}").run();
}

describe("RelationRepo", () => {
  test("setMembers writes ordered relations and getMemberIds returns them in order", async () => {
    const db = createMigratedInMemoryDatabase();
    const repo = new RelationRepo(db);

    try {
      await seedItem(db, "gallery0001", "gallery");
      await seedItem(db, "photo000001");
      await seedItem(db, "photo000002");
      await seedItem(db, "photo000003");

      await repo.setMembers("gallery0001", ["photo000001", "photo000002", "photo000003"]);

      expect(await repo.getMemberIds("gallery0001")).toEqual([
        "photo000001",
        "photo000002",
        "photo000003",
      ]);
    } finally {
      db.close();
    }
  });

  test("reordering members preserves the new order with no unique-constraint error", async () => {
    const db = createMigratedInMemoryDatabase();
    const repo = new RelationRepo(db);

    try {
      await seedItem(db, "gallery0001", "gallery");
      await seedItem(db, "photo000001");
      await seedItem(db, "photo000002");
      await seedItem(db, "photo000003");

      await repo.setMembers("gallery0001", ["photo000001", "photo000002", "photo000003"]);
      await expect(
        repo.setMembers("gallery0001", ["photo000003", "photo000001", "photo000002"]),
      ).resolves.not.toThrow();

      expect(await repo.getMemberIds("gallery0001")).toEqual([
        "photo000003",
        "photo000001",
        "photo000002",
      ]);
    } finally {
      db.close();
    }
  });

  test("duplicate child ids are deduped, keeping the first occurrence's position", async () => {
    const db = createMigratedInMemoryDatabase();
    const repo = new RelationRepo(db);

    try {
      await seedItem(db, "gallery0001", "gallery");
      await seedItem(db, "photo000001");
      await seedItem(db, "photo000002");

      await repo.setMembers("gallery0001", [
        "photo000001",
        "photo000002",
        "photo000001",
      ]);

      expect(await repo.getMemberIds("gallery0001")).toEqual([
        "photo000001",
        "photo000002",
      ]);
    } finally {
      db.close();
    }
  });

  test("setMembers with an empty array clears all members", async () => {
    const db = createMigratedInMemoryDatabase();
    const repo = new RelationRepo(db);

    try {
      await seedItem(db, "gallery0001", "gallery");
      await seedItem(db, "photo000001");

      await repo.setMembers("gallery0001", ["photo000001"]);
      expect(await repo.getMemberIds("gallery0001")).toEqual(["photo000001"]);

      await repo.setMembers("gallery0001", []);
      expect(await repo.getMemberIds("gallery0001")).toEqual([]);
    } finally {
      db.close();
    }
  });

  test("getMemberIds returns an empty array when there are no relations", async () => {
    const db = createMigratedInMemoryDatabase();
    const repo = new RelationRepo(db);

    try {
      await seedItem(db, "gallery0001", "gallery");
      expect(await repo.getMemberIds("gallery0001")).toEqual([]);
    } finally {
      db.close();
    }
  });

  test("setMembers scopes relations by rel_type, leaving other rel types untouched", async () => {
    const db = createMigratedInMemoryDatabase();
    const repo = new RelationRepo(db);

    try {
      await seedItem(db, "gallery0001", "gallery");
      await seedItem(db, "photo000001");
      await seedItem(db, "photo000002");

      await repo.setMembers("gallery0001", ["photo000001"], "other_rel");
      await repo.setMembers("gallery0001", ["photo000002"], GALLERY_MEMBER);

      expect(await repo.getMemberIds("gallery0001", "other_rel")).toEqual(["photo000001"]);
      expect(await repo.getMemberIds("gallery0001", GALLERY_MEMBER)).toEqual(["photo000002"]);
    } finally {
      db.close();
    }
  });
});
