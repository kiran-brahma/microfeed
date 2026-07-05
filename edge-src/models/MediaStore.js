import {AwsClient} from "aws4fetch";

function isExternalOrEmpty(internalUrl) {
  if (!internalUrl) {
    return true;
  }
  return /^https?:\/\//i.test(internalUrl);
}

export class MediaStore {
  constructor(env) {
    this.env = env;
  }

  async deleteObject(internalUrl) {
    if (isExternalOrEmpty(internalUrl)) {
      return null;
    }

    const {env} = this;
    const accessKeyId = `${env.R2_ACCESS_KEY_ID}`;
    const secretAccessKey = `${env.R2_SECRET_ACCESS_KEY}`;
    const bucket = env.R2_PUBLIC_BUCKET;
    // The internally-stored media url is host-stripped but ALREADY includes the
    // project/environment prefix — uploads save `${projectPrefix}/${key}` (see
    // onGetR2PresignedUrlRequestPost's mediaBaseUrl = projectPrefix). So the R2
    // object key IS the internal url; do NOT prepend projectPrefix again.
    const endpoint = `https://${bucket}.${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${internalUrl}`;

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    });

    const request = new Request(endpoint, {
      method: "DELETE",
    });

    return aws.fetch(request);
  }
}

export function createMediaStore(env) {
  return new MediaStore(env);
}

export default MediaStore;
