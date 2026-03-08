/**
 * LinkVerse charts — HTML5 Canvas only, no libraries.
 * Grayscale palette. No decorative color.
 */

var CHART_COLORS = ['#c0c0c0', '#707070', '#505050', '#909090', '#383838'];

function getCanvas(id) {
  var el = document.getElementById(id);
  if (!el || !el.getContext) return null;
  var dpr = window.devicePixelRatio || 1;
  var ctx = el.getContext('2d');
  var w = el.clientWidth;
  var h = el.clientHeight || 150;
  el.width = w * dpr;
  el.height = h * dpr;
  ctx.scale(dpr, dpr);
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  return { canvas: el, ctx: ctx, w: w, h: h };
}

function renderLineChart(canvasId, data) {
  var c = getCanvas(canvasId);
  if (!c) return null;
  var ctx = c.ctx, w = c.w, h = c.h;

  if (!data || data.length === 0) {
    ctx.fillStyle = '#707070';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data', w / 2, h / 2);
    return null;
  }

  var padding = { top: 10, right: 10, bottom: 24, left: 36 };
  var chartW = w - padding.left - padding.right;
  var chartH = h - padding.top - padding.bottom;

  var maxVal = Math.max.apply(null, data.map(function(d) { return d.clicks || 0; })) || 1;
  var minVal = 0;

  ctx.strokeStyle = '#707070';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (var i = 0; i < data.length; i++) {
    var x = padding.left + (i / (data.length - 1 || 1)) * chartW;
    var y = padding.top + chartH - ((data[i].clicks - minVal) / (maxVal - minVal || 1)) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#707070';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  var step = data.length > 10 ? 3 : 1;
  for (var j = 0; j < data.length; j += step) {
    var lx = padding.left + (j / (data.length - 1 || 1)) * chartW;
    ctx.fillText(data[j].day ? data[j].day.slice(5) : '', lx, h - 6);
  }

  ctx.textAlign = 'right';
  var yTicks = 5;
  for (var k = 0; k <= yTicks; k++) {
    var v = Math.round(minVal + (maxVal - minVal) * (k / yTicks));
    var ty = padding.top + chartH - (k / yTicks) * chartH;
    ctx.fillText(String(v), padding.left - 6, ty + 4);
  }

  var el = document.getElementById(canvasId);
  if (!el.dataset.chartHover) {
    el.dataset.chartHover = '1';
    el.addEventListener('mousemove', function(ev) {
      var rect = el.getBoundingClientRect();
      var mx = ev.clientX - rect.left;
      var my = ev.clientY - rect.top;
      var idx = Math.round(((mx - padding.left) / chartW) * (data.length - 1));
      if (idx >= 0 && idx < data.length) {
        var drawn = renderLineChart(canvasId, data);
        if (drawn && drawn.ctx) {
          drawn.ctx.fillStyle = '#e0e0e0';
          drawn.ctx.font = '11px monospace';
          drawn.ctx.textAlign = 'left';
          drawn.ctx.fillText(data[idx].day + ': ' + data[idx].clicks + ' clicks', mx + 8, my);
        }
      }
    });
  }
  return { ctx: ctx, w: w, h: h };
}

function renderBarChart(canvasId, data, labelKey, valueKey) {
  var c = getCanvas(canvasId);
  if (!c) return;
  var ctx = c.ctx, w = c.w, h = c.h;

  if (!data || data.length === 0) {
    ctx.fillStyle = '#707070';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data', w / 2, h / 2);
    return;
  }

  var maxVal = Math.max.apply(null, data.map(function(d) { return d[valueKey] || 0; })) || 1;
  var barH = 18;
  var gap = 8;
  var labelW = 80;
  var barMaxW = w - labelW - 60;

  ctx.font = '12px monospace';
  for (var i = 0; i < Math.min(data.length, 10); i++) {
    var d = data[i];
    var val = d[valueKey] || 0;
    var label = String(d[labelKey] || '');
    var y = i * (barH + gap);
    ctx.fillStyle = '#707070';
    ctx.textAlign = 'left';
    ctx.fillText(label, 0, y + barH - 4);
    var bw = (val / maxVal) * barMaxW;
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(labelW, y, bw, barH);
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'right';
    ctx.fillText(String(val), w, y + barH - 4);
  }
}

function renderDonutChart(canvasId, data, labelKey, valueKey) {
  var c = getCanvas(canvasId);
  if (!c) return;
  var ctx = c.ctx, w = c.w, h = c.h;

  if (!data || data.length === 0) {
    ctx.fillStyle = '#707070';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data', w / 2, h / 2);
    return;
  }

  var total = data.reduce(function(sum, d) { return sum + (d[valueKey] || 0); }, 0) || 1;
  var cx = w / 2;
  var cy = 60;
  var r = 45;
  var strokeW = 16;
  var start = -Math.PI / 2;
  var acc = 0;

  for (var i = 0; i < data.length; i++) {
    var pct = (data[i][valueKey] || 0) / total;
    var end = start + pct * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.strokeStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'butt';
    ctx.stroke();
    start = end;
  }

  ctx.fillStyle = '#707070';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  var ly = cy + r + 20;
  for (var j = 0; j < data.length; j++) {
    var pct = Math.round((data[j][valueKey] || 0) / total * 100);
    ctx.fillText(data[j][labelKey] + ' \u00b7 ' + pct + '%', cx, ly + j * 16);
  }
}

function renderReferrerChart(canvasId, data) {
  renderBarChart(canvasId, data, 'referrer', 'clicks');
}
