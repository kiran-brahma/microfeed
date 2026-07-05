import FeedCrudManager from "./FeedCrudManager";
import {STATUSES} from "../../common-src/Constants";
import {randomShortUUID} from "../../common-src/StringUtils";
import {msToRFC3339, rfc3399ToMs} from "../../common-src/TimeUtils";
import {getFieldDefs} from "../registry/ContentTypeRegistry";
import {mapItem, validateItem} from "../registry/itemMapper";
import {toPublic} from "../registry/fieldKinds";

const slugify = require("slugify");

function normalizePath(path) {
  if (Array.isArray(path)) {
    return path;
  }
  return String(path).split(".");
}

function getByPath(obj, path) {
  const parts = normalizePath(path);
  let cursor = obj;
  for (const part of parts) {
    if (cursor === undefined || cursor === null) {
      return undefined;
    }
    cursor = cursor[part];
  }
  return cursor;
}

function setByPath(obj, path, value) {
  const parts = normalizePath(path);
  let cursor = obj;
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index];
    if (cursor[part] === undefined || cursor[part] === null || typeof cursor[part] !== "object") {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneDeep(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneDeep(entry));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneDeep(entry)]),
    );
  }
  return value;
}

function mergeDeep(baseValue, patchValue) {
  if (patchValue === undefined) {
    return cloneDeep(baseValue);
  }
  if (Array.isArray(baseValue) && Array.isArray(patchValue)) {
    return cloneDeep(patchValue);
  }
  if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
    const merged = cloneDeep(baseValue);
    Object.entries(patchValue).forEach(([key, entry]) => {
      merged[key] = mergeDeep(baseValue[key], entry);
    });
    return merged;
  }
  return cloneDeep(patchValue);
}

function normalizeSlugSource(title) {
  if (title === undefined || title === null) {
    return "";
  }

  const titleText = String(title).trim();
  if (!titleText) {
    return "";
  }

  let slug = slugify(titleText, {
    lower: true,
    strict: true,
  });

  if (!slug) {
    slug = titleText
      .normalize("NFKD")
      .toLowerCase()
      .trim()
      .replace(/['!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/\_/g, "-")
      .replace(/\-\-+/g, "-")
      .replace(/\-$/g, "");
  }

  return slug;
}

function isUniqueConstraintError(error) {
  const message = error?.message || "";
  return /UNIQUE constraint failed/i.test(message);
}

function validationError(field, message) {
  return {
    errors: [
      {
        field,
        message,
      },
    ],
  };
}

function itemInternalToRow(itemId, contentType, slug, internalItem, existingRow = null) {
  const {
    status,
    pubDateMs,
    ...data
  } = internalItem;

  const row = {
    id: itemId,
    status: status ?? STATUSES.PUBLISHED,
    content_type: contentType,
    slug,
    data: JSON.stringify(data),
  };

  if (pubDateMs !== undefined && pubDateMs !== null) {
    row.pub_date = msToRFC3339(pubDateMs);
  } else if (existingRow?.pub_date !== undefined && existingRow?.pub_date !== null) {
    row.pub_date = existingRow.pub_date;
  }

  return row;
}

function rowToPublicItem(typeName, row) {
  const publicItem = {};
  const internalData = row?.data ? JSON.parse(row.data) : {};

  getFieldDefs(typeName).forEach((fieldDef) => {
    let internalValue;
    if (fieldDef.key === "status") {
      internalValue = row.status;
    } else if (fieldDef.feedMapping.target === "pubDateMs") {
      internalValue = row.pub_date !== undefined && row.pub_date !== null
        ? rfc3399ToMs(row.pub_date)
        : undefined;
    } else {
      internalValue = getByPath(internalData, fieldDef.feedMapping.target);
    }

    const publicValue = toPublic(fieldDef, internalValue);
    if (publicValue !== undefined && publicValue !== null) {
      setByPath(publicItem, fieldDef.feedMapping.source, publicValue);
    }
  });

  return publicItem;
}

export default class ContentService extends FeedCrudManager {
  constructor(feedContent, feedDb, request) {
    super(feedContent, feedDb, request);
    this.itemRepo = feedDb.itemRepo;
  }

  async create(typeName, payload = {}) {
    const inputPayload = payload || {};
    let validation;
    try {
      validation = validateItem(typeName, inputPayload);
    } catch (error) {
      return validationError("content_type", error.message);
    }
    if (validation.errors.length > 0) {
      return validation;
    }

    const internalItem = mapItem(typeName, inputPayload);
    const itemId = inputPayload.id || randomShortUUID();
    const slugSource = normalizeSlugSource(inputPayload.title);
    const slug = slugSource || randomShortUUID();
    const existingWithSlug = await this.itemRepo.getByTypeAndSlug(typeName, slug);
    if (existingWithSlug) {
      return validationError("slug", "Slug already exists for this content type");
    }

    const row = itemInternalToRow(itemId, typeName, slug, internalItem);

    try {
      await this.itemRepo.insert(row);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return validationError("slug", "Slug already exists for this content type");
      }
      throw error;
    }

    return itemId;
  }

  async update(itemId, payload = {}) {
    const inputPayload = payload || {};
    const existingRow = await this.itemRepo.getById(itemId);
    if (!existingRow) {
      return validationError("id", "Item not found");
    }

    let typeName = existingRow.content_type;
    if (!typeName) {
      return validationError("content_type", "Item content type is missing");
    }

    let existingPublicItem;
    try {
      existingPublicItem = rowToPublicItem(typeName, existingRow);
    } catch (error) {
      return validationError("content_type", error.message);
    }

    const mergedPublicItem = mergeDeep(existingPublicItem, inputPayload);

    let validation;
    try {
      validation = validateItem(typeName, mergedPublicItem);
    } catch (error) {
      return validationError("content_type", error.message);
    }

    if (validation.errors.length > 0) {
      return validation;
    }

    const internalItem = mapItem(typeName, mergedPublicItem);
    const slugSource = normalizeSlugSource(mergedPublicItem.title);
    const slug = slugSource || existingRow.slug || randomShortUUID();
    const existingWithSlug = await this.itemRepo.getByTypeAndSlug(typeName, slug);
    if (existingWithSlug && existingWithSlug.id !== itemId) {
      return validationError("slug", "Slug already exists for this content type");
    }

    const row = itemInternalToRow(itemId, typeName, slug, internalItem, existingRow);

    try {
      await this.itemRepo.update(itemId, row);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return validationError("slug", "Slug already exists for this content type");
      }
      throw error;
    }

    return itemId;
  }
}
