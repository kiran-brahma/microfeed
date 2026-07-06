import ItemRepo from "../models/ItemRepo";
import FeedDb from "../models/FeedDb";
import {serializeItemForFeed} from "../models/FeedItemSerializer";
import {getPublicNavLinks} from "./publicNavTypes";
import {STATUSES, DEFAULT_ITEMS_PER_PAGE} from "../../common-src/Constants";

/**
 * Resolves a public per-type listing page (/blog/, /photo/, /i/): paginates
 * PUBLISHED items of one content_type via ItemRepo.listPaginated (cursor
 * pagination), serializes them for the public shape, and computes the
 * shared nav-types list. Mirrors resolveRecordPage/resolveAggregatorPage so
 * route handlers stay thin.
 */
export async function resolveTypeListingPage(env, request, contentType) {
  const itemRepo = new ItemRepo(env.FEED_DB);
  const feedDb = new FeedDb(env, request);
  const content = await feedDb.getContent();
  const webGlobalSettings = (content.settings && content.settings.webGlobalSettings) || {};
  const publicBucketUrl = webGlobalSettings.publicBucketUrl || "";

  const urlObject = new URL(request.url);
  const nextCursorParam = urlObject.searchParams.get("next_cursor");
  const prevCursorParam = urlObject.searchParams.get("prev_cursor");

  const page = await itemRepo.listPaginated({
    queryKwargs: {
      content_type: contentType,
      status: STATUSES.PUBLISHED,
    },
    limit: webGlobalSettings.itemsPerPage || DEFAULT_ITEMS_PER_PAGE,
    nextCursor: nextCursorParam ? parseInt(nextCursorParam, 10) : undefined,
    prevCursor: prevCursorParam ? parseInt(prevCursorParam, 10) : undefined,
  });

  const items = page.results.map((row) => serializeItemForFeed(row, {publicBucketUrl}));
  const navTypes = await getPublicNavLinks(itemRepo);

  return {
    items,
    nextCursor: page.items_next_cursor,
    prevCursor: page.items_prev_cursor,
    navTypes,
    channel: content.channel || {},
  };
}

export default resolveTypeListingPage;
