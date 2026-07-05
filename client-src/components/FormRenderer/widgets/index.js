import React from "react";
import ImageUploadWidget from "./ImageUploadWidget";
import MediaUploadWidget from "./MediaUploadWidget";
import TagsWidget from "./TagsWidget";

export function mediaWidgets(publicBucketUrl) {
  return {
    image: (props) => <ImageUploadWidget {...props} publicBucketUrl={publicBucketUrl} />,
    media: (props) => <MediaUploadWidget {...props} publicBucketUrl={publicBucketUrl} />,
  };
}

export function tagsWidget() {
  return {
    tags: TagsWidget,
  };
}

export { ImageUploadWidget, MediaUploadWidget, TagsWidget };
