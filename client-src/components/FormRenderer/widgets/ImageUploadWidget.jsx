import React, { useRef, useState } from "react";
import Requests from "../../../common/requests";
import { randomHex, urlJoinWithRelative } from "../../../../common-src/StringUtils";

function fieldLabel(fieldDef) {
  return fieldDef.label || fieldDef.key;
}

function RequiredLabel({ fieldDef }) {
  return (
    <span>
      {fieldLabel(fieldDef)}
      {fieldDef.required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
  );
}

function FieldError({ error }) {
  if (!error) {
    return null;
  }
  return <div className="text-xs text-red-500 mt-1">{error.message}</div>;
}

function extensionOf(filename) {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) {
    return "";
  }
  return filename.slice(idx + 1);
}

export default function ImageUploadWidget({ fieldDef, value, onChange, error, publicBucketUrl }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const previewUrl = value ? urlJoinWithRelative(publicBucketUrl, value) : null;

  function handleFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      return;
    }

    const ext = extensionOf(file.name);
    const cdnFilename = `images/${randomHex(32)}${ext ? `.${ext}` : ""}`;

    setUploading(true);
    setProgress(0);
    setUploadError(null);

    Requests.upload(
      file,
      cdnFilename,
      (fraction) => {
        setProgress(fraction);
      },
      (mediaUrl) => {
        setUploading(false);
        onChange(mediaUrl);
      },
      () => {
        setUploading(false);
        setUploadError("Failed to upload. Please try again.");
      },
      () => {
        setUploading(false);
        setUploadError("Failed to upload. Please try again.");
      }
    );

    // Reset the input so selecting the same file again still fires onChange.
    e.target.value = "";
  }

  return (
    <div>
      <div className="lh-page-subtitle">
        <RequiredLabel fieldDef={fieldDef} />
      </div>

      {previewUrl && (
        <div className="mt-2 flex items-center gap-3">
          <img src={previewUrl} alt={fieldLabel(fieldDef)} className="h-24 w-24 object-cover rounded-md border border-gray-300" />
          <button
            type="button"
            className="text-xs text-red-500 underline"
            onClick={() => onChange(undefined)}
          >
            Remove
          </button>
        </div>
      )}

      <div className="mt-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="text-xs text-gray-500 mt-1">
          Uploading... {(progress * 100).toFixed(0)}%
        </div>
      )}
      {uploadError && <div className="text-xs text-red-500 mt-1">{uploadError}</div>}

      <FieldError error={error} />
    </div>
  );
}
