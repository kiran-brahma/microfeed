import React from "react";
import FormRenderer from "../../../components/FormRenderer";
import AdminInput from "../../../components/AdminInput";
import { mediaWidgets, tagsWidget, referenceWidget } from "../../../components/FormRenderer/widgets";
import FilterTagsWidget from "../../../components/FormRenderer/widgets/FilterTagsWidget";
import LandingPreview from "../LandingPreview";
import { getFieldDefs } from "../../../../edge-src/registry/ContentTypeRegistry";
import Requests from "../../../common/requests";
import { showToast } from "../../../common/ToastUtils";
import { ADMIN_URLS, toSlug } from "../../../../common-src/StringUtils";

const SUBMIT_STATUS__START = 1;

function seedPayload(contentType, item) {
  if (!item) {
    return {};
  }
  const fieldDefs = getFieldDefs(contentType);
  const payload = {};
  fieldDefs.forEach((fieldDef) => {
    if (Object.prototype.hasOwnProperty.call(item, fieldDef.key)) {
      payload[fieldDef.key] = item[fieldDef.key];
    }
  });
  return payload;
}

export default class SchemaItemEditor extends React.Component {
  constructor(props) {
    super(props);

    this.onSave = this.onSave.bind(this);

    const { contentType, item } = props;
    this.state = {
      // Seed the schema fields plus the system-level slug (edited separately
      // from the content-type fields, so the user can define the url).
      payload: {
        ...seedPayload(contentType, item),
        ...(item && item.slug ? { slug: item.slug } : {}),
      },
      errors: [],
      submitStatus: null,
      topLevelError: null,
    };
  }

  onSave(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    const { contentType, item } = this.props;
    const { payload } = this.state;
    const isEdit = !!item;

    this.setState({ submitStatus: SUBMIT_STATUS__START, errors: [], topLevelError: null });

    const request = isEdit
      ? Requests.axiosPut(`/admin/ajax/items/${item.id}`, payload)
      : Requests.axiosPost("/admin/ajax/items", { content_type: contentType, ...payload });

    request
      .then(() => {
        showToast(isEdit ? "Updated!" : "Created!", "success");
        this.setState({ submitStatus: null }, () => {
          setTimeout(() => {
            window.location.href = ADMIN_URLS.allItems();
          }, 800);
        });
      })
      .catch((error) => {
        const response = error && error.response;
        if (response && response.status === 400 && response.data && response.data.errors) {
          this.setState({ submitStatus: null, errors: response.data.errors });
        } else {
          this.setState({
            submitStatus: null,
            topLevelError: "Failed. Please try again.",
          });
          showToast("Failed. Please try again.", "error");
        }
      });
  }

  render() {
    const { contentType, item, publicBucketUrl } = this.props;
    const { payload, errors, submitStatus, topLevelError } = this.state;
    const isEdit = !!item;
    const submitting = submitStatus === SUBMIT_STATUS__START;
    const fieldDefs = getFieldDefs(contentType);
    const isLandingPage = contentType === "landing_page";
    const slugError = errors.find((err) => err.field === "slug");

    return (
      <form className="grid grid-cols-12 gap-4" onSubmit={this.onSave}>
        <div className="col-span-9 grid grid-cols-1 gap-4">
          <div className="lh-page-card">
            {topLevelError && (
              <div className="text-sm text-red-500 mb-4">{topLevelError}</div>
            )}
            <FormRenderer
              fieldDefs={fieldDefs}
              value={payload}
              onChange={(nextPayload) => this.setState({ payload: nextPayload })}
              errors={errors}
              widgets={{
                ...mediaWidgets(publicBucketUrl),
                ...tagsWidget(),
                ...referenceWidget(),
                filter_tags: FilterTagsWidget,
              }}
            />
          </div>
          {isLandingPage && <LandingPreview payload={payload} />}
        </div>
        <div className="col-span-3">
          <div className="sticky top-8 grid grid-cols-1 gap-4">
            <div className="lh-page-card">
              <AdminInput
                label="URL slug"
                value={payload.slug || ''}
                placeholder={toSlug(payload.title) || 'auto-generated'}
                onChange={(e) => this.setState({ payload: { ...payload, slug: e.target.value } })}
              />
              <div className="text-xs text-gray-400 mt-1">
                {(() => {
                  const finalSlug = toSlug(payload.slug) || toSlug(payload.title) || '(auto)';
                  return <span>URL: <span className="text-gray-600 font-mono">/{finalSlug}</span></span>;
                })()}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Leave blank to generate from the title. On edit, the slug stays fixed unless you change it here.
              </div>
              {slugError && <div className="text-xs text-red-500 mt-2">{slugError.message}</div>}
            </div>
            <div className="lh-page-card text-center">
              <button
                type="submit"
                className="lh-btn lh-btn-brand-dark lh-btn-lg"
                onClick={this.onSave}
                disabled={submitting}
              >
                {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      </form>
    );
  }
}
