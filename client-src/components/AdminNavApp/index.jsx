import React from 'react';
import clsx from 'clsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  HomeIcon,
  Cog6ToothIcon,
  PlusIcon,
  ListBulletIcon,
  PencilSquareIcon,
  ArrowLeftOnRectangleIcon,
  TagIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import {ADMIN_URLS, unescapeHtml, urlJoinWithRelative} from "../../../common-src/StringUtils";
import {NAV_ITEMS, NAV_ITEMS_DICT} from "../../../common-src/Constants";
import {resolveBrand} from "../../../common-src/BrandUtils";

// The nav logo/brand link is resolved from the settings embedded in the
// `feed-content` script tag (see AdminWholeHtml), the same source every other
// admin page reads its feed/settings data from. If a `brandLogo` has been
// configured in Settings we show that image (prefixed with the public bucket
// url, matching every other stored-image field); otherwise the nav renders the
// configured brand name as a text wordmark, so there is no dependency on any
// bundled brand asset.
function readBrandInfoFromFeedContent() {
  const fallback = {
    brand: resolveBrand(null),
    logoUrl: null,
  };
  try {
    const $feedContent = document.getElementById('feed-content');
    if (!$feedContent) {
      return fallback;
    }
    const feedContent = JSON.parse(unescapeHtml($feedContent.innerHTML));
    const brand = resolveBrand(feedContent.settings);
    const webGlobalSettings = (feedContent.settings && feedContent.settings.webGlobalSettings) || {};
    const publicBucketUrl = webGlobalSettings.publicBucketUrl || '';
    const logoUrl = brand.brandLogo
      ? urlJoinWithRelative(publicBucketUrl, brand.brandLogo)
      : null;
    return {brand, logoUrl};
  } catch (e) {
    return fallback;
  }
}

function NavItem({url, title, navId, currentId, Icon, disabled}) {
  return (
    <a href={disabled ? '#' : url}>
      <div
        className={clsx('text-white py-4 px-4 xl:px-8 flex items-center',
        disabled ? 'text-muted-color cursor-not-allowed hover:text-muted-color' : 'hover:text-brand-light',
        navId === currentId ? 'font-semibold bg-brand-light hover:text-white hover:opacity-80' : '')}
      >
        {Icon && <div className="mr-2">
          <Icon className="w-3 xl:w-5" />
        </div>}
        <div className="text-sm xl:text-xl">
          {title}
        </div>
      </div>
    </a>
  );
}

export default class AdminNavApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      'currentPage': props.currentPage || NAV_ITEMS.ADMIN_HOME,
    }
  }

  componentDidMount() {
  }

  render() {
    const {currentPage} = this.state;
    const {upperLevel, AccessoryComponent} = this.props;
    const onboardingResult = this.props.onboardingResult || {requiredOk: true};
    const {brand, logoUrl} = readBrandInfoFromFeedContent();
    return (<div className="flex flex-col min-h-screen min-w-screen">
      <div className="grid grid-cols-12 gap-4 bg-white flex items-center border-b drop-shadow-sm">
        <div className="col-span-2 py-4 px-4 xl:px-8">
          <a href={ADMIN_URLS.home()} className="hover:opacity-50">
            {logoUrl
              ? <img src={logoUrl} alt={brand.brandName} className="w-full"/>
              : <span className="font-bold text-lg xl:text-2xl text-brand-dark">{brand.brandName}</span>}
          </a>
        </div>
        <div className="col-span-10 flex items-center">
          {upperLevel && <div className="py-6 pl-4 xl:pl-16">
            <a href={upperLevel.url}><span className="lh-icon-arrow-left"/> {upperLevel.name}</a>
            <span className="mx-2">/</span>
            <span className="text-muted-color">{upperLevel.childName}</span>
          </div>}
          {AccessoryComponent && <div>{AccessoryComponent}</div>}
          <div className="flex-1 text-right py-6 px-4 xl:px-16">
            <a href={ADMIN_URLS.logout()} className="hover:opacity-50 text-brand-dark font-semibold text-sm">
              <div className="flex items-center justify-end">
                <div className="mr-1"><ArrowLeftOnRectangleIcon className="w-4"/></div>
                <div>Logout</div>
              </div>
            </a>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 flex-1">
        <div className="col-span-2 bg-brand-dark flex-none">
          <nav className="py-8">
            <NavItem
              url={ADMIN_URLS.home()}
              title={NAV_ITEMS_DICT[NAV_ITEMS.ADMIN_HOME].name}
              navId={NAV_ITEMS.ADMIN_HOME}
              currentId={currentPage}
              Icon={HomeIcon}
            />
            <NavItem
              url={ADMIN_URLS.editPrimaryChannel()}
              title={NAV_ITEMS_DICT[NAV_ITEMS.EDIT_CHANNEL].name}
              navId={NAV_ITEMS.EDIT_CHANNEL}
              currentId={currentPage}
              Icon={PencilSquareIcon}
              disabled={!onboardingResult.requiredOk}
            />
            <NavItem
              url={ADMIN_URLS.newItem()}
              title={NAV_ITEMS_DICT[NAV_ITEMS.NEW_ITEM].name}
              navId={NAV_ITEMS.NEW_ITEM}
              currentId={currentPage}
              Icon={PlusIcon}
              disabled={!onboardingResult.requiredOk}
            />
            <NavItem
              url={ADMIN_URLS.allItems()}
              title={NAV_ITEMS_DICT[NAV_ITEMS.ALL_ITEMS].name}
              navId={NAV_ITEMS.ALL_ITEMS}
              currentId={currentPage}
              Icon={ListBulletIcon}
              disabled={!onboardingResult.requiredOk}
            />
            <NavItem
              url={ADMIN_URLS.tags()}
              title={NAV_ITEMS_DICT[NAV_ITEMS.TAGS].name}
              navId={NAV_ITEMS.TAGS}
              currentId={currentPage}
              Icon={TagIcon}
              disabled={!onboardingResult.requiredOk}
            />
            <NavItem
              url={ADMIN_URLS.media()}
              title={NAV_ITEMS_DICT[NAV_ITEMS.MEDIA].name}
              navId={NAV_ITEMS.MEDIA}
              currentId={currentPage}
              Icon={PhotoIcon}
              disabled={!onboardingResult.requiredOk}
            />
            <NavItem
              url={ADMIN_URLS.settings()}
              title={NAV_ITEMS_DICT[NAV_ITEMS.SETTINGS].name}
              navId={NAV_ITEMS.SETTINGS}
              currentId={currentPage}
              Icon={Cog6ToothIcon}
              disabled={!onboardingResult.requiredOk}
            />
          </nav>
        </div>
        <div className="col-span-10 w-full">
          <div className="py-8 px-4 xl:px-16">
            {this.props.children}
          </div>
        </div>
      </div>
      <ToastContainer
        newestOnTop
      />
    </div>);
  }
}
