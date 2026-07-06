import React from 'react';
import AdminNavApp from '../../../components/AdminNavApp';
import MediaLibrary from '../../../components/MediaLibrary';
import {NAV_ITEMS} from '../../../../common-src/Constants';
import {unescapeHtml} from '../../../../common-src/StringUtils';

export default class MediaApp extends React.Component {
  constructor(props) {
    super(props);

    const $onboardingResult = document.getElementById('onboarding-result');
    const onboardingResult = $onboardingResult
      ? JSON.parse(unescapeHtml($onboardingResult.innerHTML))
      : {requiredOk: true};

    this.state = {onboardingResult};
  }

  render() {
    const {onboardingResult} = this.state;
    return (<AdminNavApp
      currentPage={NAV_ITEMS.MEDIA}
      onboardingResult={onboardingResult}
    >
      <div className="lh-page-card m-4">
        <div className="lh-page-title mb-2">Media manager</div>
        <div className="text-sm text-muted-color mb-4">
          All uploaded images. Filter to unused ones and delete them to reclaim storage.
          Use “Sync with storage” to pull in images uploaded outside this manager.
        </div>
        <MediaLibrary manageMode />
      </div>
    </AdminNavApp>);
  }
}
