/**
 * LinkVerse charts — HTML5 Canvas only, no libraries.
 * Grayscale palette. No decorative color.
 */

var CHART_COLORS = ['#c0c0c0', '#707070', '#505050', '#909090', '#383838'];

function getCanvas(id, forcedHeight) {
  var el = document.getElementById(id);
  if (!el || !el.getContext) return null;
  // Prevent canvas intrinsic aspect ratio from squishing the width when height is changed
  el.style.width = '100%';
  var dpr = window.devicePixelRatio || 1;
  var ctx = el.getContext('2d');
  
  var w = el.clientWidth || 400;
  var h = forcedHeight || el.clientHeight || 150;
  
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

function truncateLabel(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  var ellipsis = '\u2026';
  while (text.length > 1 && ctx.measureText(text + ellipsis).width > maxWidth) {
    text = text.slice(0, -1);
  }
  return text + ellipsis;
}

function renderBarChart(canvasId, data, labelKey, valueKey) {
  var el = document.getElementById(canvasId);
  if (!el) return;

  var rows = Math.min((data || []).length, 10);
  var barH = 18;
  var gap = 10;
  var paddingV = 8;
  var neededH = rows > 0 ? rows * (barH + gap) - gap + paddingV * 2 : 60;

  var c = getCanvas(canvasId, neededH);
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
  // Give labels 38% of width, value column 36px, rest is bar
  var labelW = Math.floor(w * 0.38);
  var valueColW = 36;
  var barMaxW = w - labelW - valueColW - 8;

  ctx.font = '12px monospace';
  for (var i = 0; i < rows; i++) {
    var d = data[i];
    var val = d[valueKey] || 0;
    var rawLabel = String(d[labelKey] || '');
    var y = paddingV + i * (barH + gap);

    // Truncated label
    var label = truncateLabel(ctx, rawLabel, labelW - 6);
    ctx.fillStyle = '#707070';
    ctx.textAlign = 'left';
    ctx.fillText(label, 0, y + barH - 4);

    // Bar
    var bw = Math.max((val / maxVal) * barMaxW, 2);
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(labelW, y, bw, barH);

    // Value
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'right';
    ctx.fillText(String(val), w, y + barH - 4);
  }
}

function renderDonutChart(canvasId, data, labelKey, valueKey) {
  var el = document.getElementById(canvasId);
  if (!el) return;

  var lineH = 22;
  var r = 50;
  var ringCY = r + 15;          // centre of donut ring
  var legendTop = ringCY + r + 45; // Padded from the chart pie
  var legendRows = data ? Math.min(data.length, 8) : 0;
  var neededH = legendTop + legendRows * lineH + 16;

  var c = getCanvas(canvasId, neededH);
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
  var cy = ringCY;
  var strokeW = 16;
  var start = -Math.PI / 2;

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

  ctx.fillStyle = '#a0a0a0';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (var j = 0; j < legendRows; j++) {
    var p = Math.round((data[j][valueKey] || 0) / total * 100);
    ctx.fillText(data[j][labelKey] + ' \u00b7 ' + p + '%', cx, legendTop + j * lineH);
  }
}

function renderReferrerChart(canvasId, data) {
  renderBarChart(canvasId, data, 'referrer', 'clicks');
}
