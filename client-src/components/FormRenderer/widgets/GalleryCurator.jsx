import React, { useEffect, useState } from "react";
import Requests from "../../../common/requests";

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

export default function GalleryCurator({ fieldDef, value, onChange, error }) {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    Requests.axiosGet("/admin/ajax/items?content_type=photo").then((res) => {
      const nextItems = (res && res.data && res.data.items) || [];
      setPhotos(nextItems);
    });
  }, []);

  const memberIds = Array.isArray(value) ? value : [];
  const photoById = photos.reduce((lookup, photo) => {
    lookup[photo.id] = photo;
    return lookup;
  }, {});

  const availablePhotos = photos.filter((photo) => !memberIds.includes(photo.id));

  function moveUp(index) {
    if (index <= 0) {
      return;
    }
    const next = [...memberIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index) {
    if (index >= memberIds.length - 1) {
      return;
    }
    const next = [...memberIds];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function removeAt(index) {
    const next = memberIds.filter((_, i) => i !== index);
    onChange(next);
  }

  function addPhoto(e) {
    const photoId = e.target.value;
    if (!photoId) {
      return;
    }
    onChange([...memberIds, photoId]);
    e.target.value = "";
  }

  return (
    <div>
      <div className="lh-page-subtitle">
        <RequiredLabel fieldDef={fieldDef} />
      </div>
      <ul className="flex flex-col gap-2 mb-3">
        {memberIds.map((id, index) => {
          const photo = photoById[id];
          const title = photo ? photo.title : id;
          const image = photo && photo.image;
          return (
            <li
              key={id}
              data-testid="gallery-curator-member"
              className="flex items-center gap-2 border border-gray-200 rounded-md px-2 py-1"
            >
              {image && (
                <img src={image} alt={title} className="w-10 h-10 object-cover rounded" />
              )}
              <span className="flex-1 text-sm">{title}</span>
              <button
                type="button"
                aria-label="Move up"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="lh-btn lh-btn-sm"
              >
                &uarr;
              </button>
              <button
                type="button"
                aria-label="Move down"
                onClick={() => moveDown(index)}
                disabled={index === memberIds.length - 1}
                className="lh-btn lh-btn-sm"
              >
                &darr;
              </button>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => removeAt(index)}
                className="lh-btn lh-btn-sm"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
      <select
        data-testid="gallery-curator-add-select"
        aria-label="Add photo"
        className="lh-select text-sm"
        value=""
        onChange={addPhoto}
      >
        <option value="">Add photo…</option>
        {availablePhotos.map((photo) => (
          <option key={photo.id} value={photo.id}>
            {photo.title}
          </option>
        ))}
      </select>
      <FieldError error={error} />
    </div>
  );
}
