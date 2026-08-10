'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDispatchRequest } = require('./notify-redeploy');

test('buildDispatchRequest throws a clear error without a token', () => {
  assert.throws(() => buildDispatchRequest(undefined), /ABOUT_REPO_PAT/);
});

test('buildDispatchRequest builds a POST to the about dispatches endpoint', () => {
  const { url, options } = buildDispatchRequest('fake-token');
  assert.equal(url, 'https://api.github.com/repos/touktw/about/dispatches');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, 'Bearer fake-token');
  assert.equal(JSON.parse(options.body).event_type, 'project-released');
});
