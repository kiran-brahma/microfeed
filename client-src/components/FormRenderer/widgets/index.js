import React from "react";
import ImageUploadWidget from "./ImageUploadWidget";
import MediaUploadWidget from "./MediaUploadWidget";

export function mediaWidgets(publicBucketUrl) {
  return {
    image: (props) => <ImageUploadWidget {...props} publicBucketUrl={publicBucketUrl} />,
    media: (props) => <MediaUploadWidget {...props} publicBucketUrl={publicBucketUrl} />,
  };
}

export { ImageUploadWidget, MediaUploadWidget };
