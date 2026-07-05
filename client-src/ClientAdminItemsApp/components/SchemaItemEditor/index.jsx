import React from "react";
import FormRenderer from "../../../components/FormRenderer";
import { mediaWidgets } from "../../../components/FormRenderer/widgets";
import { getFieldDefs } from "../../../../edge-src/registry/ContentTypeRegistry";
import Requests from "../../../common/requests";
import { showToast } from "../../../common/ToastUtils";
import { ADMIN_URLS } from "../../../../common-src/StringUtils";

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
      payload: seedPayload(contentType, item),
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
              widgets={mediaWidgets(publicBucketUrl)}
            />
          </div>
        </div>
        <div className="col-span-3">
          <div className="sticky top-8">
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
