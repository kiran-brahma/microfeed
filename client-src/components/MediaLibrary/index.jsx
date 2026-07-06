import React from 'react';
import clsx from 'clsx';
import Requests from '../../common/requests';
import {ADMIN_URLS, unescapeHtml, urlJoinWithRelative} from '../../../common-src/StringUtils';
import {showToast} from '../../common/ToastUtils';

// Read the R2 public bucket url from the feed-content script tag (the same
// source every admin page reads settings from). Media rows store a
// host-stripped, project/env-prefixed url; prefixing the bucket url yields a
// browser-loadable thumbnail src.
export function readPublicBucketUrl() {
  try {
    const $feedContent = document.getElementById('feed-content');
    if (!$feedContent) {
      return '';
    }
    const feedContent = JSON.parse(unescapeHtml($feedContent.innerHTML));
    const webGlobalSettings = (feedContent.settings && feedContent.settings.webGlobalSettings) || {};
    return webGlobalSettings.publicBucketUrl || '';
  } catch (e) {
    return '';
  }
}

function fullUrl(publicBucketUrl, internalUrl) {
  if (!internalUrl) {
    return '';
  }
  if (/^https?:\/\//i.test(internalUrl)) {
    return internalUrl;
  }
  return urlJoinWithRelative(publicBucketUrl, internalUrl);
}

/**
 * Reusable media inventory grid. Backs both the Media Manager page
 * (management mode: multi-select + delete + reconcile + unused filter) and the
 * "choose from uploaded" picker (select mode: click a tile to pick its url).
 *
 * Props:
 *   - selectMode: boolean — click a tile to call onSelect(fullUrl)
 *   - onSelect: (url) => void
 *   - manageMode: boolean — show delete/reconcile/filter controls
 */
export default class MediaLibrary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      loading: true,
      unusedOnly: false,
      selectedIds: {},
      deleting: false,
      reconciling: false,
      publicBucketUrl: readPublicBucketUrl(),
    };

    this.load = this.load.bind(this);
    this.onToggleUnused = this.onToggleUnused.bind(this);
    this.onToggleSelect = this.onToggleSelect.bind(this);
    this.onDeleteSelected = this.onDeleteSelected.bind(this);
    this.onReconcile = this.onReconcile.bind(this);
  }

  componentDidMount() {
    this.load();
  }

  load() {
    const {unusedOnly} = this.state;
    this.setState({loading: true});
    return Requests.axiosGet(`${ADMIN_URLS.ajaxMediaList()}?limit=500&unusedOnly=${unusedOnly}`)
      .then((res) => {
        this.setState({items: (res.data && res.data.results) || [], loading: false, selectedIds: {}});
      })
      .catch(() => {
        this.setState({loading: false});
        showToast('Failed to load media.', 'error');
      });
  }

  onToggleUnused() {
    this.setState((s) => ({unusedOnly: !s.unusedOnly}), this.load);
  }

  onToggleSelect(id) {
    this.setState((s) => {
      const selectedIds = {...s.selectedIds};
      if (selectedIds[id]) {
        delete selectedIds[id];
      } else {
        selectedIds[id] = true;
      }
      return {selectedIds};
    });
  }

  onDeleteSelected() {
    const ids = Object.keys(this.state.selectedIds);
    if (ids.length === 0) {
      return;
    }
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${ids.length} image(s)? This permanently removes the files from storage.`)) {
      return;
    }
    this.setState({deleting: true});
    Requests.axiosPost(ADMIN_URLS.ajaxMediaDelete(), {ids})
      .then((res) => {
        const {deleted = [], refused = []} = res.data || {};
        this.setState({deleting: false});
        if (refused.length > 0) {
          showToast(`${deleted.length} deleted, ${refused.length} skipped (in use).`, 'warning', 4000);
        } else {
          showToast(`${deleted.length} image(s) deleted.`, 'success');
        }
        this.load();
      })
      .catch(() => {
        this.setState({deleting: false});
        showToast('Delete failed.', 'error');
      });
  }

  onReconcile() {
    this.setState({reconciling: true});
    Requests.axiosPost(ADMIN_URLS.ajaxMediaReconcile(), {})
      .then((res) => {
        const added = (res.data && res.data.added) || [];
        this.setState({reconciling: false});
        showToast(`Synced with storage. ${added.length} new image(s) found.`, 'success');
        this.load();
      })
      .catch(() => {
        this.setState({reconciling: false});
        showToast('Sync failed.', 'error');
      });
  }

  render() {
    const {selectMode, manageMode, onSelect} = this.props;
    const {items, loading, unusedOnly, selectedIds, deleting, reconciling, publicBucketUrl} = this.state;
    const selectedCount = Object.keys(selectedIds).length;

    return (<div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={unusedOnly} onChange={this.onToggleUnused} />
          Show unused only
        </label>
        {manageMode && <button
          type="button"
          className="lh-btn lh-btn-brand-light text-sm"
          onClick={this.onReconcile}
          disabled={reconciling}
        >
          {reconciling ? 'Syncing…' : 'Sync with storage'}
        </button>}
        {manageMode && selectedCount > 0 && <button
          type="button"
          className="lh-btn lh-btn-red text-sm"
          onClick={this.onDeleteSelected}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : `Delete selected (${selectedCount})`}
        </button>}
        <button type="button" className="text-sm text-muted-color underline" onClick={this.load}>
          Refresh
        </button>
      </div>

      {loading ? <div className="text-muted-color text-sm">Loading…</div> :
        (items.length === 0 ? <div className="text-muted-color text-sm">No images{unusedOnly ? ' (unused)' : ''}.</div> :
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((m) => {
              const src = fullUrl(publicBucketUrl, m.url);
              const selected = !!selectedIds[m.id];
              return (<div
                key={m.id}
                className={clsx(
                  'border rounded overflow-hidden relative cursor-pointer',
                  selected ? 'ring-2 ring-brand-light' : '',
                )}
                onClick={() => {
                  if (selectMode && onSelect) {
                    onSelect(src, m);
                  } else if (manageMode) {
                    this.onToggleSelect(m.id);
                  }
                }}
              >
                <div className="aspect-square bg-gray-50 flex items-center justify-center">
                  <img src={src} alt="" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="p-2 text-xs">
                  <span className={clsx(
                    'inline-block px-2 py-0.5 rounded text-white',
                    m.used ? 'bg-green-600' : 'bg-gray-400',
                  )}>
                    {m.used ? 'Used' : 'Unused'}
                  </span>
                  {m.used && m.references && m.references.length > 0 && <div className="mt-1 text-muted-color truncate" title={m.references.map((r) => `${r.type}: ${r.label}`).join(', ')}>
                    {m.references.map((r) => r.label).join(', ')}
                  </div>}
                </div>
                {manageMode && <div className="absolute top-1 left-1">
                  <input type="checkbox" checked={selected} readOnly />
                </div>}
              </div>);
            })}
          </div>)}
    </div>);
  }
}
