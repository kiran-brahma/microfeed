const GALLERY_MEMBER = "gallery_member";

export default class RelationRepo {
  constructor(db) {
    this.db = db;
  }

  async setMembers(parentId, childIds = [], relType = GALLERY_MEMBER) {
    const dedupedChildIds = [];
    const seen = new Set();
    (childIds || []).forEach((childId) => {
      if (!seen.has(childId)) {
        seen.add(childId);
        dedupedChildIds.push(childId);
      }
    });

    const statements = [
      this.db.prepare(
        "DELETE FROM item_relations WHERE parent_item_id = ? AND rel_type = ?",
      ).bind(parentId, relType),
    ];

    dedupedChildIds.forEach((childId, index) => {
      statements.push(
        this.db.prepare(
          "INSERT INTO item_relations (parent_item_id, child_item_id, rel_type, position) VALUES (?, ?, ?, ?)",
        ).bind(parentId, childId, relType, index),
      );
    });

    return this.db.batch(statements);
  }

  async getMemberIds(parentId, relType = GALLERY_MEMBER) {
    const response = await this.db.prepare(
      "SELECT child_item_id FROM item_relations WHERE parent_item_id = ? AND rel_type = ? ORDER BY position",
    ).bind(parentId, relType).all();
    return response.results.map((row) => row.child_item_id);
  }
}

export {GALLERY_MEMBER};
