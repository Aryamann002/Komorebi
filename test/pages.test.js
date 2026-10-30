import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { EVENT_TYPES } from '../lib/event-types.js';
import { CURRENCIES, LANGUAGES, MAX_BUDGET, MAX_GUESTS, TEXT_LIMITS } from '../lib/schema.js';

const PUBLIC = new URL('../public/', import.meta.url);
const pages = readdirSync(PUBLIC).filter((file) => file.endsWith('.html'));

/** Mirrors `cleanUrls` in vercel.json: `/` serves index.html and `/plan` serves plan.html. */
function fileFor(pathname) {
  const path = pathname.slice(1) || 'index';
  return new URL(path.includes('.') ? path : `${path}.html`, PUBLIC);
}

for (const page of pages) {
  describe(page, () => {
    const html = readFileSync(new URL(page, PUBLIC), 'utf8');
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
    const urls = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1]);

    it('links only to pages, files and anchors that exist', () => {
      for (const url of urls.filter((value) => !/^[a-z]+:/i.test(value))) {
        if (url.startsWith('#')) {
          assert.ok(ids.has(url.slice(1)), `no element with id for ${url}`);
          continue;
        }
        const { pathname } = new URL(url, 'https://komorebi.local/');
        assert.ok(existsSync(fileFor(pathname)), `no file serves ${url}`);
      }
    });

    // The CSP in vercel.json allows only same-origin scripts, styles and images, and nothing inline.
    it('loads nothing the Content-Security-Policy would block', () => {
      assert.doesNotMatch(html, /\ssrc="(?:https?:)?\/\//, 'third-party src');
      assert.doesNotMatch(html, /<link[^>]*\shref="(?:https?:)?\/\//, 'third-party stylesheet or font');
      assert.doesNotMatch(html, /\sstyle="/, 'inline style attribute');
      assert.doesNotMatch(html, /<style[\s>]/, 'inline style block');
      assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, 'inline script');
    });

    it('declares a language and has exactly one h1', () => {
      assert.match(html, /<html lang="[a-z]{2}">/);
      assert.equal(html.match(/<h1[\s>]/g)?.length, 1);
    });
  });
}

// The form's own constraints duplicate the API's; if they drift, users hit server errors the form should prevent.
describe('plan.html form matches the API', () => {
  const html = readFileSync(new URL('plan.html', PUBLIC), 'utf8');
  const field = (name) => html.match(new RegExp(`<(?:input|textarea)[^>]*\\sname="${name}"[^>]*>`))[0];
  const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const options = (name) => {
    const select = html.match(new RegExp(`<select[^>]*\\sname="${name}"[\\s\\S]*?</select>`))[0];
    return [...select.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
  };

  it('offers exactly the event types, currencies and languages the API accepts', () => {
    const eventTypes = [...html.matchAll(/\sname="eventType" value="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(eventTypes, Object.keys(EVENT_TYPES));
    assert.deepEqual(options('currency'), CURRENCIES);
    assert.deepEqual(options('language'), LANGUAGES);
  });

  it('bounds text and numbers the way the API does', () => {
    for (const [name, { min, max }] of Object.entries(TEXT_LIMITS)) {
      assert.equal(Number(attribute(field(name), 'minlength') ?? 0), min, `${name} minlength`);
      assert.equal(Number(attribute(field(name), 'maxlength')), max, `${name} maxlength`);
    }
    assert.equal(Number(attribute(field('guestCount'), 'max')), MAX_GUESTS);
    assert.equal(Number(attribute(field('budget'), 'max')), MAX_BUDGET);
  });
});
