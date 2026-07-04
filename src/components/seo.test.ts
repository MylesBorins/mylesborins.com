import { describe, expect, it } from 'vitest';

function resolveSeoImage(heroImageSrc?: string) {
  const siteUrl = new URL('https://mylesborins.com');
  return heroImageSrc
    ? new URL(heroImageSrc, siteUrl).toString()
    : new URL('/images/me.jpg', siteUrl).toString();
}

describe('SEO image resolution', () => {
  it('uses an absolute URL for a provided hero image', () => {
    expect(resolveSeoImage('/images/post.png')).toBe('https://mylesborins.com/images/post.png');
  });

  it('falls back to the site default image', () => {
    expect(resolveSeoImage()).toBe('https://mylesborins.com/images/me.jpg');
  });
});
