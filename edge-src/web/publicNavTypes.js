import {listTypes} from "../registry/ContentTypeRegistry";
import {STATUSES} from "../../common-src/Constants";
import {itemPublicUrl} from "./itemPublicUrl";

// Single source of truth for the record-type -> nav label mapping, so the
// nav bar, home page, and listing routes never duplicate this table.
const NAV_TYPE_LABELS = {
  blog_article: "Blog",
  photo: "Photos",
  podcast_episode: "Podcast",
};

function recordTypeNames() {
  return listTypes().filter((type) => type.family === "record").map((type) => type.name);
}

/**
 * Returns the record-type nav entries ({name, label, href}) for types that
 * currently have at least one PUBLISHED item. Every public route should call
 * this to populate PublicNav so the "has content" computation lives in one
 * place.
 */
export async function getPublicNavTypes(itemRepo) {
  const navTypes = [];

  for (const typeName of recordTypeNames()) {
    const response = await itemRepo.list({
      queryKwargs: {
        content_type: typeName,
        status: STATUSES.PUBLISHED,
      },
      limit: 1,
    });

    if (response.results.length > 0) {
      navTypes.push({
        name: typeName,
        label: NAV_TYPE_LABELS[typeName] || typeName,
        href: itemPublicUrl(typeName, ""),
      });
    }
  }

  return navTypes;
}

export {NAV_TYPE_LABELS};

export default {
  getPublicNavTypes,
  NAV_TYPE_LABELS,
};
