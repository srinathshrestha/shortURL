/**
 * LinkVerse API — single source of truth for all fetch calls.
 * All requests use Authorization: Bearer <token>. On 401: clear token, redirect to index.
 */

const API_BASE = '';

function getToken() {
  return localStorage.getItem('lv_token');
}

function getAuthHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

function handle401(response) {
  if (response.status === 401) {
    localStorage.removeItem('lv_token');
    localStorage.removeItem('lv_email');
    window.location.href = '/index.html';
    throw new Error('Unauthorized');
  }
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  });
  handle401(res);
  return res;
}

async function apiRegister(email, password) {
  const res = await fetch(API_BASE + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (res.status === 401) {
    const e = new Error('Unauthorized');
    e.response = res;
    throw e;
  }
  handle401(res);
  return res;
}

async function apiLogin(email, password) {
  const res = await fetch(API_BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (res.status === 401) {
    const e = new Error('Unauthorized');
    e.response = res;
    throw e;
  }
  handle401(res);
  const data = await res.json();
  return { token: data.token };
}

async function apiGetLinks() {
  const res = await apiFetch(API_BASE + '/api/links');
  const data = await res.json();
  return { links: data.links || data || [] };
}

async function apiCreateLink(longUrl, title) {
  const res = await apiFetch(API_BASE + '/api/links', {
    method: 'POST',
    body: JSON.stringify({ long_url: longUrl, title: title || null })
  });
  return res.json();
}

async function apiDeleteLink(id) {
  const res = await apiFetch(API_BASE + '/api/links/' + id, {
    method: 'DELETE'
  });
  return res;
}

async function apiGetSummary(slug, days) {
  const res = await apiFetch(API_BASE + '/api/reports/summary?slug=' + encodeURIComponent(slug) + '&days=' + days);
  return res.json();
}

async function apiGetByDay(slug, days) {
  const res = await apiFetch(API_BASE + '/api/reports/by-day?slug=' + encodeURIComponent(slug) + '&days=' + days);
  return res.json();
}

async function apiGetByCountry(slug, days) {
  const res = await apiFetch(API_BASE + '/api/reports/by-country?slug=' + encodeURIComponent(slug) + '&days=' + days);
  return res.json();
}

async function apiGetByDevice(slug, days) {
  const res = await apiFetch(API_BASE + '/api/reports/by-device?slug=' + encodeURIComponent(slug) + '&days=' + days);
  return res.json();
}

async function apiGetByReferrer(slug, days) {
  const res = await apiFetch(API_BASE + '/api/reports/by-referrer?slug=' + encodeURIComponent(slug) + '&days=' + days);
  return res.json();
}

function apiGetExportUrl(slug, days) {
  return API_BASE + '/api/reports/export?slug=' + encodeURIComponent(slug) + '&days=' + days;
}

async function apiDownloadExport(slug, days, filename) {
  const url = apiGetExportUrl(slug, days);
  const res = await apiFetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'clicks.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
