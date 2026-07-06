import React from "react";
import ItemRepo from "../edge-src/models/ItemRepo";
import FeedDb from "../edge-src/models/FeedDb";
import {serializeItemForFeed} from "../edge-src/models/FeedItemSerializer";
import {listTypes} from "../edge-src/registry/ContentTypeRegistry";
import HomePage from "../edge-src/web/HomePage";
import {getPublicNavLinks} from "../edge-src/web/publicNavTypes";
import {serializeChannelForWeb} from "../edge-src/web/publicChannel";
import {renderReactToHtml} from "../edge-src/common/PageUtils";
import {STATUSES} from "../common-src/Constants";

const HOME_ITEMS_LIMIT = 20;

function recordTypeNames() {
  return listTypes().filter((type) => type.family === "record").map((type) => type.name);
}

export async function onRequestGet({env, request}) {
  const feedDb = new FeedDb(env, request);
  const content = await feedDb.getContent();
  const webGlobalSettings = (content.settings && content.settings.webGlobalSettings) || {};
  const publicBucketUrl = webGlobalSettings.publicBucketUrl || "";

  const itemRepo = new ItemRepo(env.FEED_DB);
  const response = await itemRepo.list({
    queryKwargs: {
      content_type__in: recordTypeNames(),
      status: STATUSES.PUBLISHED,
    },
    orderBy: ["pub_date desc", "id"],
    limit: HOME_ITEMS_LIMIT,
  });

  const items = response.results.map((row) => serializeItemForFeed(row, {publicBucketUrl}));
  const navTypes = await getPublicNavLinks(itemRepo);

  const urlObject = new URL(request.url);
  const canonicalUrl = `${urlObject.origin}/`;

  const html = renderReactToHtml(
    <HomePage channel={serializeChannelForWeb(content.channel, publicBucketUrl)} items={items} canonicalUrl={canonicalUrl} navTypes={navTypes} />,
  );
  return new Response(html, {
    headers: {"content-type": "text/html; charset=utf-8"},
  });
}
