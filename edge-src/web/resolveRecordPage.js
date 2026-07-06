import ItemRepo from "../models/ItemRepo";
import FeedDb from "../models/FeedDb";
import {serializeItemForFeed} from "../models/FeedItemSerializer";
import {getPublicNavLinks} from "./publicNavTypes";
import {STATUSES} from "../../common-src/Constants";

const VISIBLE_STATUSES = new Set([STATUSES.PUBLISHED, STATUSES.UNLISTED]);

/**
 * Resolves a public record-type page by (content_type, slug): looks the row
 * up directly via ItemRepo (FeedDb's content-fetch is list/paginate-shaped
 * and doesn't resolve a single row by slug), honours PUBLISHED/UNLISTED
 * visibility, and serializes the row into the clean public item shape
 * templates render from. Returns null when the item is missing or hidden
 * (UNPUBLISHED/DELETED) — callers should respond 404 in that case.
 */
export async function resolveRecordPage(env, request, contentType, slug) {
  const itemRepo = new ItemRepo(env.FEED_DB);
  const row = await itemRepo.getByTypeAndSlug(contentType, slug);
  if (!row || !VISIBLE_STATUSES.has(row.status)) {
    return null;
  }

  const feedDb = new FeedDb(env, request);
  const content = await feedDb.getContent();
  const webGlobalSettings = (content.settings && content.settings.webGlobalSettings) || {};
  const publicBucketUrl = webGlobalSettings.publicBucketUrl || "";

  const item = serializeItemForFeed(row, {publicBucketUrl});
  const navTypes = await getPublicNavLinks(itemRepo);

  return {row, item, content, publicBucketUrl, channel: content.channel || {}, navTypes};
}

export default resolveRecordPage;
