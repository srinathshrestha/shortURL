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
  var div = document.createElement('a'); // use <a> for list-group-item-action
  div.href = '#';
  div.className = 'list-group-item list-group-item-action border-0 border-bottom rounded-0 py-3' + (isSelected ? ' active bg-primary-subtle border-primary text-body' : '');
  div.dataset.id = link.id;
  div.dataset.slug = link.slug;
  var title = link.title || link.slug;
  var shortUrl = getShortUrl(link.slug);
  var isTextMuted = isSelected ? '' : ' text-muted';
  
  div.innerHTML =
    '<div class="d-flex w-100 justify-content-between mb-1">' +
      '<h6 class="mb-0 text-truncate pe-2">' + escapeHtml(title) + '</h6>' +
      '<small class="text-nowrap' + isTextMuted + '">' + escapeHtml(formatDate(link.created_at)) + '</small>' +
    '</div>' +
    '<div class="mb-1 font-monospace small link-item-url text-primary" data-copy="' + escapeHtml(shortUrl) + '" style="cursor: pointer;">' + escapeHtml(shortUrl) + '</div>' +
    '<div class="d-flex justify-content-between align-items-center mt-2">' +
      '<small class="text-truncate ' + isTextMuted + '" style="max-width: 80%;">' + escapeHtml(truncateUrl(link.long_url, 50)) + '</small>' +
      '<button class="btn btn-sm btn-link text-danger p-0 text-decoration-none link-item-delete" data-id="' + escapeHtml(link.id) + '">Delete</button>' +
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
  div.className = 'list-group-item border-0 border-bottom rounded-0 py-3 skeleton';
  div.style.height = '104px';
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

  container.querySelectorAll('.list-group-item').forEach(function(card) {
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
      document.querySelectorAll('#links-list .list-group-item').forEach(function(c) { 
        c.classList.remove('active', 'bg-primary-subtle', 'border-primary', 'text-body'); 
      });
      card.classList.add('active', 'bg-primary-subtle', 'border-primary', 'text-body');
      loadAnalytics(selectedLink.slug);
    });
  });
}

function showAnalyticsEmpty() {
  var emptyEl = document.getElementById('analytics-empty');
  var loadedEl = document.getElementById('analytics-loaded');
  if (emptyEl) {
    emptyEl.classList.remove('d-none');
    emptyEl.classList.add('d-flex');
  }
  if (loadedEl) {
    loadedEl.classList.remove('d-block');
    loadedEl.classList.add('d-none');
  }
}

function loadAnalytics(slug) {
  var emptyEl = document.getElementById('analytics-empty');
  var loadedEl = document.getElementById('analytics-loaded');
  var errEl = document.getElementById('analytics-error');
  if (emptyEl) {
    emptyEl.classList.remove('d-flex');
    emptyEl.classList.add('d-none');
  }
  if (loadedEl) {
    loadedEl.classList.remove('d-none');
    loadedEl.classList.add('d-block');
  }
  if (errEl) {
    errEl.classList.add('d-none');
    errEl.textContent = '';
  }

  var slugEl = document.getElementById('analytics-slug');
  if (slugEl) slugEl.textContent = slug;

  var daysEl = document.getElementById('day-toggles');
  if (daysEl) {
    daysEl.innerHTML = '';
    [7, 30, 90].forEach(function(d) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline-secondary ' + (selectedDays === d ? 'active' : '');
      btn.textContent = d + 'd';
      btn.dataset.days = d;
      btn.addEventListener('click', function() {
        if (parseInt(this.dataset.days) === selectedDays) return;
        selectedDays = parseInt(this.dataset.days);
        loadAnalytics(slug);
      });
      daysEl.appendChild(btn);
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
        '<div class="col-12 col-md-4">' +
          '<div class="card bg-body-tertiary border-0 shadow-sm h-100">' +
            '<div class="card-body">' +
              '<h6 class="card-subtitle mb-2 text-muted">Total Clicks</h6>' +
              '<h3 class="card-title mb-0">' + total.toLocaleString() + '</h3>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="col-12 col-md-4">' +
          '<div class="card bg-body-tertiary border-0 shadow-sm h-100">' +
            '<div class="card-body">' +
              '<h6 class="card-subtitle mb-2 text-muted">Top Country</h6>' +
              '<h3 class="card-title mb-0 text-truncate" title="' + escapeHtml(topCountry) + '">' + escapeHtml(topCountry) + '</h3>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="col-12 col-md-4">' +
          '<div class="card bg-body-tertiary border-0 shadow-sm h-100">' +
            '<div class="card-body">' +
              '<h6 class="card-subtitle mb-2 text-muted">Top Device</h6>' +
              '<h3 class="card-title mb-0 text-truncate" title="' + escapeHtml(topDevice) + '">' + escapeHtml(topDevice) + '</h3>' +
            '</div>' +
          '</div>' +
        '</div>';
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
      errEl.classList.remove('d-none');
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
