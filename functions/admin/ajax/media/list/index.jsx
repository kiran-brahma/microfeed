import {createMediaService} from "../../../../../edge-src/models/MediaService";
import {createMediaStore} from "../../../../../edge-src/models/MediaStore";

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
    status,
  });
}

export async function onRequestGet({request, env}) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page'), 10) || 1;
  const limit = parseInt(url.searchParams.get('limit'), 10) || 50;
  const unusedOnly = url.searchParams.get('unusedOnly') === 'true';

  const mediaService = createMediaService(env, env.FEED_DB, createMediaStore(env));
  const result = await mediaService.listWithUsage({page, limit, unusedOnly});

  return jsonResponse(result, 200);
}
