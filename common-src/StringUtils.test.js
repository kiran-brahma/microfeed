import {randomShortUUID, buildAudioUrlWithTracking, removeHostFromUrl, urlJoinWithRelative} from "./StringUtils";

test('randomShortUUID', () => {
  expect(randomShortUUID().length).toBe(11);
  expect(randomShortUUID(20).length).toBe(20);
});

test('buildAudioUrlWithTracking', () => {
  const audioUrl = 'https://www.audio.com/audio.mp3'
  let trackingUrls = [
    'http://firsturl.com/123',
    'https://secondurl.com/abc/',
    'https://thridurl.com/aaa/bbb',
    'www.noprotocal.com/asdfsad',
  ];
  const finalUrl = 'https://firsturl.com/123/secondurl.com/abc/thridurl.com/aaa/bbb/www.noprotocal.com/asdfsad/www.audio.com/audio.mp3';
  expect(buildAudioUrlWithTracking(audioUrl, trackingUrls)).toBe(finalUrl);

  trackingUrls = [];
  expect(buildAudioUrlWithTracking(audioUrl, trackingUrls)).toBe(audioUrl);

  trackingUrls = ['http://firsturl.com/123/'];
  expect(buildAudioUrlWithTracking(audioUrl, trackingUrls)).toBe("https://firsturl.com/123/www.audio.com/audio.mp3");

  trackingUrls = [''];
  expect(buildAudioUrlWithTracking(audioUrl, trackingUrls)).toBe(audioUrl);
});

test('urlJoinWithRelative', () => {
  const baseUrl = 'https://media.example.com';

  expect(urlJoinWithRelative(baseUrl, 'production/images/hero.webp'))
    .toBe('https://media.example.com/production/images/hero.webp');
  expect(urlJoinWithRelative(baseUrl, '/assets/default/logo.png'))
    .toBe('/assets/default/logo.png');
  expect(urlJoinWithRelative('', 'production/images/hero.webp'))
    .toBe('/production/images/hero.webp');

  // Re-absolutizing a value that's already absolute (e.g. an item field
  // serialized by serializeItemForFeed, which already prefixed it with
  // publicBucketUrl) must not double-prefix it.
  const alreadyAbsolute = 'https://media.example.com/production/images/hero.webp';
  expect(urlJoinWithRelative(baseUrl, alreadyAbsolute)).toBe(alreadyAbsolute);
  expect(urlJoinWithRelative('https://other-host.example.com', alreadyAbsolute)).toBe(alreadyAbsolute);
});

test('removeHostFromUrl', () => {
  const url = 'https://www.audio.com/project/hello/audio.mp3';
  expect(removeHostFromUrl(url)).toBe('project/hello/audio.mp3');
  const badUrl = 'asfafffaf'
  expect(removeHostFromUrl(badUrl)).toBe(badUrl);
});
