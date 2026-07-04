import {randomShortUUID} from "../../common-src/StringUtils";
import {
  STATUSES, PREDEFINED_SUBSCRIBE_METHODS,
  SETTINGS_CATEGORIES, DEFAULT_ITEMS_PER_PAGE, ITEMS_SORT_ORDERS, MAX_ITEMS_PER_PAGE,
} from '../../common-src/Constants';
import {msToRFC3339, rfc3399ToMs} from "../../common-src/TimeUtils";
import FeedPublicJsonBuilder from "./FeedPublicJsonBuilder";
import ChannelRepo from "./ChannelRepo";
import ItemRepo from "./ItemRepo";
import SettingsRepo from "./SettingsRepo";

/**
 * support url query parameters:
 * - next_cursor: pub_date in milliseconds
 * - prev_cursor: pub_date in milliseconds
 * - sort: "oldest_first", or "newest_first" (default).
 *
 * if next_cursor and prev_cursor co-exist, we choose next_cursor and ignore prev_cursor
 *
 * Example: /json/?next_cursor=1669249854169&sort=oldest_first
 */
export function getFetchItemsParams(request, queryKwargs = {}, limit = null) {
  const fetchItems = {
    queryKwargs,
    fromUrl: {},
    limit,
  };

  const { searchParams } = new URL(request.url)
  const nextCursor = searchParams.get('next_cursor');
  const prevCursor = searchParams.get('prev_cursor');
  const sortOrder = searchParams.get('sort');
  if (sortOrder) {
    fetchItems.fromUrl.sortOrder = sortOrder;
  }
  if (nextCursor) {
    try {
      fetchItems.fromUrl.nextCursor = parseInt(nextCursor, 10);
    } catch (error) {
      console.log(error);
    }
  } else if (prevCursor) {
    try {
      fetchItems.fromUrl.prevCursor = parseInt(prevCursor, 10);
    } catch (error) {
      console.log(error);
    }
  }
  return fetchItems;
}

function getSettingJson(settingObj) {
  return {
    ...JSON.parse(settingObj.data),
  };
}

function getChannelJson(channelObj) {
  const channelData = channelObj?.data ? JSON.parse(channelObj.data) : {};
  return {
    ...channelData,
    id: channelObj.id,
    status: channelObj.status,
    is_primary: channelObj.is_primary,
  };
}

function getItemJson(itemObj) {
  const itemData = itemObj?.data ? JSON.parse(itemObj.data) : {};
  const itemJson = {
    ...itemData,
    id: itemObj.id,
    status: itemObj.status,
    pubDateMs: rfc3399ToMs(itemObj.pub_date),
  };
  if (itemObj.content_type !== undefined) {
    itemJson.content_type = itemObj.content_type;
  }
  if (itemObj.slug !== undefined) {
    itemJson.slug = itemObj.slug;
  }
  return {
    ...itemJson,
  };
}

function channelContentToRow(channel) {
  const {id, status, is_primary, ...data} = channel;
  return {
    id,
    status,
    is_primary,
    data: JSON.stringify(data),
  };
}

function settingsContentToRow(category, value) {
  return {
    category,
    data: JSON.stringify(value),
  };
}

function itemContentToRow(item) {
  const {
    id,
    status,
    pubDateMs,
    pub_date,
    content_type,
    slug,
    ...data
  } = item;
  const row = {
    id,
    status,
    content_type,
    slug,
    data: JSON.stringify(data),
  };
  if (pub_date !== undefined) {
    row.pub_date = pub_date;
  } else if (pubDateMs !== undefined) {
    row.pub_date = msToRFC3339(pubDateMs);
  }
  return row;
}

export default class FeedDb {
  constructor(env, request) {
    this.FEED_DB = env.FEED_DB;
    this.channelRepo = new ChannelRepo(this.FEED_DB);
    this.itemRepo = new ItemRepo(this.FEED_DB);
    this.settingsRepo = new SettingsRepo(this.FEED_DB);

    const urlObj = new URL(request.url);
    this.baseUrl = urlObj.origin;

    this.request = request;
  }

  _getRepo(table) {
    switch (table) {
      case 'channels':
        return this.channelRepo;
      case 'items':
        return this.itemRepo;
      case 'settings':
        return this.settingsRepo;
      default:
        throw new Error(`Unsupported table: ${table}`);
    }
  }

  /**
   * INSERT INTO users (name, age) VALUES (?1, ?2)
   * UPDATE users SET name = ?1 WHERE id = ?2
   */
  getInsertSql(table, keyValuePairs) {
    return this._getRepo(table).buildInsertStatement(keyValuePairs);
  }

  getUpdateSql(table, queryKwargs, keyValuePairs) {
    return this._getRepo(table).buildUpdateStatement(queryKwargs, keyValuePairs);
  }

  getUpsertSql(table, primaryKey, queryKwargs, keyValuePairs) {
    return this._getRepo(table).buildUpsertStatement({
      ...queryKwargs,
      ...keyValuePairs,
    });
  }

  async initDb() {
    const settings = {
      [SETTINGS_CATEGORIES.SUBSCRIBE_METHODS]: {
        methods: [
          {...PREDEFINED_SUBSCRIBE_METHODS.rss, id: randomShortUUID(), editable: false, enabled: true},
          {...PREDEFINED_SUBSCRIBE_METHODS.json, id: randomShortUUID(), editable: false, enabled: true},
        ],
      },
      [SETTINGS_CATEGORIES.WEB_GLOBAL_SETTINGS]: {
        favicon: {
          'url': '/assets/default/favicon.png',
          'contentType': 'image/png',
        },
        'itemsSortOrder': ITEMS_SORT_ORDERS.NEWEST_FIRST,
        'itemsPerPage': DEFAULT_ITEMS_PER_PAGE,
      },
      [SETTINGS_CATEGORIES.ACCESS]: {
        currentPolicy: 'public',
      },
      [SETTINGS_CATEGORIES.ANALYTICS]: {},
      [SETTINGS_CATEGORIES.CUSTOM_CODE]: {},
    };
    const channel = {
      image: '/assets/default/channel-image.png',
      link: this.baseUrl,
      language: 'en-us',
      categories: [],
      'itunes:explicit': false,
      'itunes:type': 'episodic',
      'itunes:complete': false,
      'itunes:block': false,
      'copyright': `©${(new Date()).getFullYear()}`,
    };
    const channelId = randomShortUUID();

    const batchStatements = [
      this.getInsertSql('channels', channelContentToRow({
        id: channelId,
        status: STATUSES.PUBLISHED,
        is_primary: 1,
        ...channel,
      })),
    ];

    Object.keys(settings).forEach((s) => {
      batchStatements.push(this.getInsertSql('settings', settingsContentToRow(s, settings[s])));
    })

    await this.FEED_DB.batch(batchStatements);

    return {
      channel: {
        id: channelId,
        status: STATUSES.PUBLISHED,
        is_primary: 1,
        ...channel,
      },
      items: [],
      settings,
    };
  }

  /**
   *  An array like this:
   *    [
   *      {
   *        'table': 'channels',  // (required)
   *        'queryKwargs': {
   *          'status': STATUSES.PUBLISHED,
   *          'channel_type': PRIMARY,
   *        },  // (optional)
   *        'limit': 1   // (optional)
   *      }
   *      {
   *        'table': 'settings',
   *        'queryKwargs': {
   *          ...
   *        }
   *      }
   *   ]
   */
  async _getContent(things, sortOrder, fromUrl) {
    const responses = await Promise.all(things.map((thing) => this._getRepo(thing.table).list({
      queryKwargs: thing.queryKwargs,
      orderBy: thing.orderBy,
      limit: thing.limit,
    })));
    const contentJson = {};
    for (let i = 0; i < things.length; i++) {
      const response = responses[i];
      const thing = things[i];
      if (thing.table === 'settings') {
        contentJson.settings = {};
        response.results.forEach((result) => {
          contentJson['settings'][result.category] = getSettingJson(result);
        });
      } else if (thing.table === 'channels') {
        contentJson.channel = {};
        response.results.forEach((result) => {
          if (result.is_primary) {
            contentJson['channel'] = getChannelJson(result);
          }
        });
      } else if (thing.table === 'items') {
        const page = await this.itemRepo.listPaginated({
          queryKwargs: thing.queryKwargs,
          orderBy: thing.orderBy,
          limit: thing.limit,
          sortOrder,
          nextCursor: fromUrl?.nextCursor,
          prevCursor: fromUrl?.prevCursor,
        });
        contentJson['items'] = page.results.map((result) => getItemJson(result));
        contentJson['items_sort_order'] = page.items_sort_order;
        if (page.items_next_cursor !== undefined) {
          contentJson['items_next_cursor'] = page.items_next_cursor;
        }
        if (page.items_prev_cursor !== undefined) {
          contentJson['items_prev_cursor'] = page.items_prev_cursor;
        }
      }
    }
    return contentJson;
  }

  async getContent(fetchItems = null) {
    let contentJson = {
      channel: {},
      settings: {},
    };
    const channelRow = await this.channelRepo.getPrimaryPublished();
    const settingRows = (await this.settingsRepo.listAll()).results;
    if (!channelRow || !settingRows || settingRows.length === 0) {
      contentJson = await this.initDb();
    } else {
      contentJson.channel = getChannelJson(channelRow);
      settingRows.forEach((result) => {
        contentJson.settings[result.category] = getSettingJson(result);
      });
    }

    if (fetchItems) {
      const webGlobalSettings = contentJson.settings.webGlobalSettings || {};
      const fromUrl = fetchItems.fromUrl || {};
      const queryKwargs = {...(fetchItems.queryKwargs || {})};
      const sortOrder = fromUrl.sortOrder || webGlobalSettings.itemsSortOrder || ITEMS_SORT_ORDERS.NEWEST_FIRST;
      const {nextCursor, prevCursor} = fromUrl;
      let limit = fetchItems.limit || webGlobalSettings.itemsPerPage || DEFAULT_ITEMS_PER_PAGE;

      if (limit < 0) {
        limit = undefined;
      } else if (limit > MAX_ITEMS_PER_PAGE) {
        limit = MAX_ITEMS_PER_PAGE;
      }

      const page = await this.itemRepo.listPaginated({
        queryKwargs,
        limit,
        sortOrder,
        nextCursor,
        prevCursor,
      });
      contentJson.items = page.results.map((result) => getItemJson(result));
      contentJson.items_sort_order = page.items_sort_order;
      if (page.items_next_cursor !== undefined) {
        contentJson.items_next_cursor = page.items_next_cursor;
      }
      if (page.items_prev_cursor !== undefined) {
        contentJson.items_prev_cursor = page.items_prev_cursor;
      }
    }

    return contentJson;
  }

  async _putChannelToContent(channel) {
    const row = channelContentToRow(channel);
    await this.channelRepo.upsert(row);
  }

  async _updateOrAddSetting(settings, category) {
    await this.settingsRepo.upsert(settingsContentToRow(category, settings[category]));
  }

  async _putSettingsToContent(settings) {
    for (const category of Object.keys(settings)) {
      await this._updateOrAddSetting(settings, category);
    }
  }

  async _putItemToContent(item) {
    await this.itemRepo.upsert(itemContentToRow(item));
  }

  async putContent(feed) {
    const {channel, settings, item} = feed;
    if (channel) {
      await this._putChannelToContent(channel);
    }

    if (settings) {
      await this._putSettingsToContent(settings);
    }

    if (item) {
      await this._putItemToContent(item);
    }
  }

  async getPublicJsonData(content=null, forOneItem=false) {
    if (!content) {
      content = await this.getContent();
    }
    const builder = new FeedPublicJsonBuilder(content, this.baseUrl, this.request, forOneItem);
    return builder.getJsonData();
  }
}
