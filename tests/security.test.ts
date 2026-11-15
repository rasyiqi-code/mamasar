import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRateLimit,
  isSafeMediaUrl,
  isSafeOutboundUrl,
  safeJsonLd,
} from '../src/lib/security.ts';

describe('safeJsonLd', () => {
  it('escapes HTML-significant characters to prevent script tag breakout', () => {
    const serialized = safeJsonLd({
      name: '</script><script>alert(1)</script>',
      note: 'A & B',
      lines: 'foo\u2028bar\u2029baz',
    });

    assert.equal(serialized.includes('<'), false);
    assert.equal(serialized.includes('>'), false);
    assert.equal(serialized.includes('&'), false);
    assert.equal(serialized.includes('\u2028'), false);
    assert.equal(serialized.includes('\u2029'), false);
    assert.equal(serialized.includes('\\u003c/script\\u003e'), true);

    const parsed = JSON.parse(serialized);
    assert.equal(parsed.name, '</script><script>alert(1)</script>');
    assert.equal(parsed.note, 'A & B');
  });
});

describe('isSafeMediaUrl', () => {
  it('allows /uploads/ relative paths and https URLs while rejecting http and dangerous protocols', () => {
    assert.equal(isSafeMediaUrl('/uploads/produk/test.jpg'), true);
    assert.equal(isSafeMediaUrl('https://ik.imagekit.io/demo/produk.webp'), true);
    assert.equal(isSafeMediaUrl('http://localhost:4321/img.png'), false);
    assert.equal(isSafeMediaUrl('/uploads/../secret.jpg'), false);
    assert.equal(isSafeMediaUrl('javascript:alert(1)'), false);
    assert.equal(isSafeMediaUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.equal(isSafeMediaUrl('vbscript:msgbox(1)'), false);
    assert.equal(isSafeMediaUrl('//evil.example/payload.js'), false);
    assert.equal(isSafeMediaUrl(''), false);
  });
});

describe('isSafeOutboundUrl (anti-SSRF)', () => {
  it('rejects non-http(s) protocols, localhost, metadata, and private IP literals', async () => {
    const blockedUrls = [
      'file:///etc/passwd',
      'ftp://example.com/file',
      'http://localhost/admin',
      'http://127.0.0.1:8080/secret',
      'http://10.0.0.1/internal',
      'http://172.16.5.4/internal',
      'http://192.168.1.1/router',
      'http://169.254.169.254/latest/meta-data/',
      'http://0.0.0.0/',
      'http://[::1]/',
      'http://[fc00::1]/',
      'http://[fe80::1]/',
      'not-a-url',
    ];

    for (const target of blockedUrls) {
      assert.equal(
        await isSafeOutboundUrl(target),
        false,
        `Expected SSRF guard to block ${target}`
      );
    }
  });

  it('rejects URLs with embedded credentials or blocked internal hostnames', async () => {
    assert.equal(await isSafeOutboundUrl('https://user:pass@93.184.216.34/'), false);
    assert.equal(await isSafeOutboundUrl('http://metadata.google.internal/'), false);
  });

  it('allows public IPv4 HTTPS/HTTP targets', async () => {
    assert.equal(await isSafeOutboundUrl('https://93.184.216.34/images/photo.jpg'), true);
  });
});

describe('checkRateLimit', () => {
  it('enforces limit within window and resets when key differs', () => {
    const uniqueKey = `test-rl-${Date.now()}-${Math.random()}`;
    const r1 = checkRateLimit(uniqueKey, 2, 60_000);
    const r2 = checkRateLimit(uniqueKey, 2, 60_000);
    const r3 = checkRateLimit(uniqueKey, 2, 60_000);

    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 1);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 0);
    assert.equal(r3.allowed, false);
    assert.ok(r3.retryAfterSeconds >= 1);

    const other = checkRateLimit(`${uniqueKey}-other`, 2, 60_000);
    assert.equal(other.allowed, true);
  });
});
