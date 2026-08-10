'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, renderNotes } = require('./build-download-pages');

test('escapeHtml escapes &, <, >', () => {
  assert.equal(escapeHtml('<b>a & b</b>'), '&lt;b&gt;a &amp; b&lt;/b&gt;');
});

test('renderNotes converts heading, list, bold, code, link', () => {
  const md = '## v1.0\n- **bold** item\n- `code` item\n- [link](https://example.com)';
  const html = renderNotes(md);
  assert.equal(
    html,
    '<h3>v1.0</h3><ul><li><strong>bold</strong> item</li>' +
    '<li><code>code</code> item</li>' +
    '<li><a href="https://example.com" target="_blank" rel="noopener">link</a></li></ul>'
  );
});

test('renderNotes treats blank lines as paragraph/list separators', () => {
  const md = 'intro line\n\n- item one';
  const html = renderNotes(md);
  assert.equal(html, '<p>intro line</p><ul><li>item one</li></ul>');
});
