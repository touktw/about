function renderStacks(stacks) {
  return stacks.map(function (group) {
    return (
      '<p class="lbl">' + group.label + '</p>' +
      '<ul class="chips">' +
      group.skills.map(function (s) { return '<li>' + s + '</li>'; }).join('') +
      '</ul>'
    );
  }).join('');
}

function renderProject(p) {
  var html = '<div class="project"><h3>';
  html += p.url
    ? '<a href="' + p.url + '" rel="noopener noreferrer">' + p.project + '</a>'
    : p.project;
  html += '</h3>';

  if (p.links && p.links.length) {
    html += '<p>' + p.links.map(function (l) {
      return '<a href="' + l.url + '" rel="noopener noreferrer">' + l.label + '</a>';
    }).join(' · ') + '</p>';
  }
  if (p.period) {
    html += '<p class="period">기간: <strong>' + p.period + '</strong></p>';
  }
  if (p.description) {
    html += '<p>' + p.description + '</p>';
  }
  if (p.details && p.details.length) {
    html += '<ul class="bullets">' +
      p.details.map(function (d) { return '<li>' + d + '</li>'; }).join('') +
      '</ul>';
  }
  html += '</div>';
  return html;
}

function renderCareer(c) {
  var html = '<details class="company"' + (c.open ? ' open' : '') + '>';
  html += '<summary>' + c.company;
  if (c.position) html += ' <span class="company-position">' + c.position + '</span>';
  var work_duration = c.work_duration ? c.work_duration : '';
  html += ' <span class="company-range">' + work_duration + '</span></summary>';
  html += '<div class="company-body">';
  if (c.summary) {
    html += '<div class="project"><p class="lbl">개요</p><p>' + c.summary + '</p></div>';
  }
  html += c.projects.map(renderProject).join('');
  html += '</div></details>';
  return html;
}

function renderKeyFeatures(items) {
  return items.map(function (f) {
    return '<li><strong>' + f.feature + '</strong> — ' + f.description + '</li>';
  }).join('');
}

function renderAppProject(p) {
  var html = '<div class="app-card">';
  html += '<h3>' + p.name + '</h3>';
  if (p.tagline) html += '<p class="app-tagline">' + p.tagline + '</p>';
  if (p.description) html += '<p>' + p.description + '</p>';
  if (p.features && p.features.length) {
    html += '<ul class="chips">' +
      p.features.map(function (f) { return '<li>' + f + '</li>'; }).join('') +
      '</ul>';
  }
  html += '<div class="app-actions">';
  if (p.downloadUrl) {
    html += '<a class="btn btn-primary" href="' + p.downloadUrl + '" rel="noopener noreferrer">다운로드</a>';
  }
  if (p.siteUrl) {
    html += '<a class="btn" href="' + p.siteUrl + '" rel="noopener noreferrer">웹사이트</a>';
  }
  if (p.repoUrl) {
    html += '<a class="btn" href="' + p.repoUrl + '" rel="noopener noreferrer">소스 코드</a>';
  }
  html += '</div>';
  if (p.license) html += '<p class="app-license">' + p.license + '</p>';
  html += '</div>';
  return html;
}

var stacksRoot = document.getElementById('stacks-root');
if (stacksRoot) stacksRoot.innerHTML = renderStacks(SITE_DATA.stacks);

var careersRoot = document.getElementById('careers-root');
if (careersRoot) careersRoot.innerHTML = SITE_DATA.careers.map(renderCareer).join('');

var keyFeaturesRoot = document.getElementById('key-features-root');
if (keyFeaturesRoot) keyFeaturesRoot.innerHTML = renderKeyFeatures(SITE_DATA.key_features);

var appsRoot = document.getElementById('apps-root');
if (appsRoot) appsRoot.innerHTML = SITE_DATA.projects.map(renderAppProject).join('');
