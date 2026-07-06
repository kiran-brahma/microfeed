import ItemRepo from "../models/ItemRepo";
import FeedDb from "../models/FeedDb";
import AggregationResolver from "../models/AggregationResolver";
import {serializeItemForFeed} from "../models/FeedItemSerializer";
import {getPublicNavLinks} from "./publicNavTypes";
import {serializeChannelForWeb} from "./publicChannel";
import {STATUSES} from "../../common-src/Constants";

const VISIBLE_STATUSES = [STATUSES.PUBLISHED, STATUSES.UNLISTED];
const VISIBLE_STATUSES_SET = new Set(VISIBLE_STATUSES);

/**
 * Resolves a public aggregator page (gallery or landing_page) by
 * (content_type, slug): looks the row up directly via ItemRepo, honours
 * PUBLISHED/UNLISTED visibility, resolves its matched member/child items
 * via AggregationResolver, and serializes the row + members into the
 * clean public shapes templates render from. Returns null when the item
 * is missing or hidden (UNPUBLISHED/DELETED) — callers should respond 404.
 */
export async function resolveAggregatorPage(env, request, contentType, slug) {
  const itemRepo = new ItemRepo(env.FEED_DB);
  const row = await itemRepo.getByTypeAndSlug(contentType, slug);
  if (!row || !VISIBLE_STATUSES_SET.has(row.status)) {
    return null;
  }

  const feedDb = new FeedDb(env, request);
  const content = await feedDb.getContent();
  const webGlobalSettings = (content.settings && content.settings.webGlobalSettings) || {};
  const publicBucketUrl = webGlobalSettings.publicBucketUrl || "";

  const resolver = new AggregationResolver(env.FEED_DB);
  const memberRows = await resolver.resolve(row, {statuses: VISIBLE_STATUSES});
  const members = memberRows.map((memberRow) => serializeItemForFeed(memberRow, {publicBucketUrl}));

  const item = serializeItemForFeed(row, {publicBucketUrl});
  const navTypes = await getPublicNavLinks(itemRepo);

  return {row, item, members, content, publicBucketUrl, channel: serializeChannelForWeb(content.channel, publicBucketUrl), navTypes};
}

export default resolveAggregatorPage;
