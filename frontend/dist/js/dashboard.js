/**
 * Dashboard — links panel, analytics panel, chart orchestration.
 */

var selectedLink = null;
var selectedDays = 7;

function getShortUrl(slug) {
  return window.location.origin + '/r/' + slug;
}

function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function truncateUrl(url, maxLen) {
  if (!url) return '';
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + '...';
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(function() {});
}

function renderLinkCard(link, isSelected) {
  var div = document.createElement('div');
  div.className = 'link-card' + (isSelected ? ' selected' : '');
  div.dataset.id = link.id;
  div.dataset.slug = link.slug;
  var title = link.title || link.slug;
  var shortUrl = getShortUrl(link.slug);
  div.innerHTML =
    '<div class="link-item-title">' + escapeHtml(title) + '</div>' +
    '<div class="link-item-url" data-copy="' + escapeHtml(shortUrl) + '">' + escapeHtml(shortUrl) + '</div>' +
    '<div class="link-item-long">' + escapeHtml(truncateUrl(link.long_url, 50)) + '</div>' +
    '<div class="link-item-meta">' +
      '<span class="link-item-date">' + escapeHtml(formatDate(link.created_at)) + '</span>' +
      '<a href="#" class="link-item-delete" data-id="' + escapeHtml(link.id) + '">Delete</a>' +
    '</div>';
  return div;
}

function escapeHtml(s) {
  if (!s) return '';
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderSkeleton() {
  var div = document.createElement('div');
  div.className = 'link-card skeleton';
  div.style.height = '80px';
  return div;
}

function loadLinks() {
  var container = document.getElementById('links-list');
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 5; i++) {
    container.appendChild(renderSkeleton());
  }
  apiGetLinks().then(function(res) {
    var links = res.links || [];
    container.innerHTML = '';
    links.forEach(function(link) {
      var card = renderLinkCard(link, selectedLink && selectedLink.id === link.id);
      container.appendChild(card);
    });
    bindLinksPanel();
  }).catch(function() {
    container.innerHTML = '<div class="form-error">Failed to load links</div>';
  });
}

function bindLinksPanel() {
  var container = document.getElementById('links-list');
  if (!container) return;

  container.querySelectorAll('.link-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.classList.contains('link-item-delete')) {
        e.preventDefault();
        e.stopPropagation();
        var id = e.target.dataset.id;
        apiDeleteLink(id).then(function() {
          if (selectedLink && selectedLink.id === id) {
            selectedLink = null;
            showAnalyticsEmpty();
          }
          loadLinks();
        });
        return;
      }
      if (e.target.classList.contains('link-item-url')) {
        e.stopPropagation();
        var url = e.target.dataset.copy;
        copyToClipboard(url);
        var orig = e.target.textContent;
        e.target.textContent = 'copied';
        setTimeout(function() { e.target.textContent = orig; }, 1200);
        return;
      }
      selectedLink = { id: card.dataset.id, slug: card.dataset.slug };
      document.querySelectorAll('.link-card').forEach(function(c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      loadAnalytics(selectedLink.slug);
    });
  });
}

function showAnalyticsEmpty() {
  var panel = document.getElementById('analytics-content');
  if (!panel) return;
  panel.innerHTML = '<div class="analytics-empty">Select a link</div>';
  document.getElementById('analytics-loaded').style.display = 'none';
}

function loadAnalytics(slug) {
  var emptyEl = document.getElementById('analytics-empty');
  var loadedEl = document.getElementById('analytics-loaded');
  var errEl = document.getElementById('analytics-error');
  if (emptyEl) emptyEl.style.display = 'none';
  if (loadedEl) loadedEl.style.display = 'block';
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  var slugEl = document.getElementById('analytics-slug');
  if (slugEl) slugEl.textContent = slug;

  var daysEl = document.getElementById('day-toggles');
  if (daysEl) {
    daysEl.innerHTML = '';
    [7, 30, 90].forEach(function(d) {
      var s = document.createElement('span');
      s.textContent = d + 'd';
      s.className = selectedDays === d ? 'active' : '';
      s.dataset.days = d;
      s.addEventListener('click', function() {
        if (parseInt(this.dataset.days) === selectedDays) return;
        selectedDays = parseInt(this.dataset.days);
        loadAnalytics(slug);
      });
      daysEl.appendChild(s);
    });
  }

  Promise.all([
    apiGetSummary(slug, selectedDays),
    apiGetByDay(slug, selectedDays),
    apiGetByCountry(slug, selectedDays),
    apiGetByDevice(slug, selectedDays),
    apiGetByReferrer(slug, selectedDays)
  ]).then(function(results) {
    var summary = results[0];
    var byDay = results[1];
    var byCountry = results[2];
    var byDevice = results[3];
    var byReferrer = results[4];

    var total = summary.total_clicks || 0;
    var topCountry = byCountry.data && byCountry.data[0] ? byCountry.data[0].country : '-';
    var topDevice = byDevice.data && byDevice.data[0] ? byDevice.data[0].device : '-';

    var summaryEl = document.getElementById('summary-row');
    if (summaryEl) {
      summaryEl.innerHTML =
        '<div class="summary-item"><label>Total Clicks</label><div class="value">' + total.toLocaleString() + '</div></div>' +
        '<div class="summary-item"><label>Top Country</label><div class="value">' + escapeHtml(topCountry) + '</div></div>' +
        '<div class="summary-item"><label>Top Device</label><div class="value">' + escapeHtml(topDevice) + '</div></div>';
    }

    renderLineChart('chart-by-day', byDay.data || []);
    renderBarChart('chart-by-country', byCountry.data || [], 'country', 'clicks');
    renderDonutChart('chart-by-device', byDevice.data || [], 'device', 'clicks');
    renderReferrerChart('chart-by-referrer', byReferrer.data || []);

    var exportEl = document.getElementById('export-link');
    if (exportEl) {
      exportEl.onclick = function(e) {
        e.preventDefault();
        apiDownloadExport(slug, selectedDays, 'clicks-' + slug + '.csv');
      };
    }
  }).catch(function() {
    var errEl = document.getElementById('analytics-error');
    if (errEl) {
      errEl.textContent = 'Failed to load analytics';
      errEl.style.display = 'block';
    }
  });
}

function initShortForm() {
  var form = document.getElementById('short-form');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var urlInput = document.getElementById('new-link-url');
    var titleInput = document.getElementById('new-link-title');
    var url = urlInput && urlInput.value.trim();
    var title = titleInput && titleInput.value.trim();
    if (!url) return;
    apiCreateLink(url, title || null).then(function(link) {
      urlInput.value = '';
      if (titleInput) titleInput.value = '';
      loadLinks();
    }).catch(function() {
      alert('Failed to create link');
    });
  });
}

function initDashboard() {
  if (!guardPage()) return;
  document.getElementById('header-email').textContent = localStorage.getItem('lv_email') || '';
  document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    logout();
  });
  initShortForm();
  loadLinks();
  showAnalyticsEmpty();
}
