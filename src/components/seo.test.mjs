import test from 'node:test';
import assert from 'node:assert/strict';

function resolveSeoImage(heroImageSrc) {
  const siteUrl = new URL('https://mylesborins.com');
  return heroImageSrc
    ? new URL(heroImageSrc, siteUrl).toString()
    : new URL('/images/me.jpg', siteUrl).toString();
}

test('uses an absolute URL for a provided hero image', () => {
  assert.equal(resolveSeoImage('/images/post.png'), 'https://mylesborins.com/images/post.png');
});

test('falls back to the site default image', () => {
  assert.equal(resolveSeoImage(), 'https://mylesborins.com/images/me.jpg');
});
