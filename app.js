
// ── State ──────────────────────────────────────────────────────────────────
let transactions = generateDataset(200);
let alerts = [];
let sortKey = 'timestamp', sortAsc = false;
let currentPage = 1; const PAGE_SIZE = 12;
let gaugeChart = null;
let charts = {};

// ── Boot ───────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildAlerts();
  updateKPIs();
  renderRecentAlerts();
  renderTransactionTable();
  initCharts();
  initRiskSection();
  initPatternsSection();
  renderAlertsPage();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(liveUpdate, 8000);
});

// ── Clock ──────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById('liveClock').textContent =
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Navigation ─────────────────────────────────────────────────────────────
function switchSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  if (el) el.classList.add('active');
  const titles = { dashboard: ['Dashboard Overview', 'Real-time fraud monitoring'], transactions: ['Transactions', 'Browse & filter all transactions'], 'ml-engine': ['ML Engine', 'Fraud prediction & model metrics'], risk: ['Risk Scoring', 'User & system risk profiles'], patterns: ['Pattern Analysis', 'Anomaly & behavioral patterns'], alerts: ['Alerts', 'Active fraud alerts'] };
  const t = titles[id] || ['Dashboard', ''];
  document.getElementById('sectionTitle').textContent = t[0];
  document.getElementById('sectionSubtitle').innerHTML = t[1] + ' · <span id="liveClock"></span>';
  updateClock();
}

// ── KPIs ───────────────────────────────────────────────────────────────────
function updateKPIs() {
  const fraud = transactions.filter(t => t.isFraud);
  const blocked = fraud.reduce((s, t) => s + t.amount, 0);
  document.getElementById('kpiTotal').textContent = transactions.length.toLocaleString();
  document.getElementById('kpiFraud').textContent = fraud.length.toLocaleString();
  document.getElementById('kpiAmount').textContent = '$' + (blocked / 1000).toFixed(1) + 'K';
  document.getElementById('headerTotal').textContent = transactions.length;
  document.getElementById('headerFraud').textContent = fraud.length;
  document.getElementById('alertBadge').textContent = alerts.filter(a => a.severity === 'critical').length;
}

// ── Alerts builder ─────────────────────────────────────────────────────────
function buildAlerts() {
  alerts = transactions.filter(t => t.isFraud).map(t => ({
    id: t.id, severity: t.riskScore >= 90 ? 'critical' : t.riskScore >= 75 ? 'high' : t.riskScore >= 60 ? 'medium' : 'low',
    title: 'Fraud detected: ' + t.id, desc: '$' + t.amount.toFixed(2) + ' · ' + t.category + ' · ' + t.location,
    time: timeAgo(t.timestamp), resolved: false
  }));
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 60000;
  if (diff < 60) return Math.floor(diff) + 'm ago';
  if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
  return Math.floor(diff / 1440) + 'd ago';
}

function renderRecentAlerts() {
  const el = document.getElementById('recentAlerts');
  el.innerHTML = alerts.slice(0, 6).map(a => alertHTML(a)).join('');
}

function alertHTML(a) {
  return `<div class="alert-item ${a.severity}">
    <div class="alert-dot"></div>
    <div class="alert-info"><div class="alert-title">${a.title}</div><div class="alert-desc">${a.desc}</div></div>
    <div class="alert-time">${a.time}</div>
    <div class="alert-severity">${a.severity}</div>
  </div>`;
}

// ── Transaction Table ──────────────────────────────────────────────────────
function renderTransactionTable() {
  let data = getFilteredTxns();
  const total = data.length;
  data.sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase();
    return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = data.slice(start, start + PAGE_SIZE);
  document.getElementById('txTableBody').innerHTML = page.map(t => `
    <tr>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--primary)">${t.id}</span></td>
      <td>${new Date(t.timestamp).toLocaleString()}</td>
      <td style="font-weight:700">$${t.amount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td>${t.category}</td>
      <td>${t.location}</td>
      <td><span class="risk-chip ${riskClass(t.riskScore)}">${t.riskScore}</span></td>
      <td><span class="badge badge-${t.status}">${t.status}</span></td>
      <td><button class="btn-view" onclick="openModal('${t.id}')">Details</button></td>
    </tr>`).join('');
  renderPagination(total);
}

function riskClass(s) { return s >= 80 ? 'risk-critical' : s >= 60 ? 'risk-high' : s >= 40 ? 'risk-medium' : 'risk-low'; }

function renderPagination(total) {
  const pages = Math.ceil(total / PAGE_SIZE);
  let html = '';
  for (let i = 1; i <= Math.min(pages, 8); i++)
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  document.getElementById('txPagination').innerHTML = html;
}

function goPage(p) { currentPage = p; renderTransactionTable(); }

function getFilteredTxns() {
  const q = (document.getElementById('txSearch')?.value || '').toLowerCase();
  const f = document.getElementById('txFilter')?.value || 'all';
  const c = document.getElementById('txCategory')?.value || 'all';
  return transactions.filter(t => {
    if (q && !t.id.toLowerCase().includes(q) && !t.location.toLowerCase().includes(q) && !t.merchant.toLowerCase().includes(q)) return false;
    if (f === 'fraud' && !t.isFraud) return false;
    if (f === 'legitimate' && t.isFraud) return false;
    if (f === 'high-risk' && t.riskScore < 60) return false;
    if (c !== 'all' && t.category !== c) return false;
    return true;
  });
}

function filterTransactions() { currentPage = 1; renderTransactionTable(); }
function sortTable(key) { if (sortKey === key) sortAsc = !sortAsc; else { sortKey = key; sortAsc = false; } renderTransactionTable(); }

function generateNewTransaction() {
  const id = transactions.length + 1;
  const t = generateTransaction(id);
  t.riskScore = scoreTransaction(t).score;
  t.isFraud = t.riskScore >= 50;
  t.status = t.isFraud ? 'fraud' : (t.riskScore > 35 ? 'review' : 'legitimate');
  transactions.unshift(t);
  if (t.isFraud) {
    alerts.unshift({ id: t.id, severity: t.riskScore >= 90 ? 'critical' : 'high', title: 'New fraud: ' + t.id, desc: '$' + t.amount.toFixed(2) + ' · ' + t.category, time: 'just now', resolved: false });
  }
  updateKPIs();
  renderTransactionTable();
  renderRecentAlerts();
  renderAlertsPage();
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal(id) {
  const t = transactions.find(x => x.id === id);
  if (!t) return;
  const ml = scoreTransaction(t);
  document.getElementById('modalContent').innerHTML = `
    <h2 style="margin-bottom:20px;font-size:18px">${t.id}</h2>
    ${row('Amount', '$' + t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }))}
    ${row('Category', t.category)}
    ${row('Merchant', t.merchant)}
    ${row('Location', t.location)}
    ${row('Timestamp', new Date(t.timestamp).toLocaleString())}
    ${row('Risk Score', t.riskScore + ' / 100')}
    ${row('ML Probability', (ml.prob * 100).toFixed(1) + '% fraud')}
    ${row('Status', t.status.toUpperCase())}
    ${row('New Device', t.newDevice ? 'Yes' : 'No')}
    ${row('VPN Detected', t.vpn ? 'Yes' : 'No')}
    ${row('Velocity (24h)', t.velocity + ' transactions')}
    ${row('Account Age', t.accountAge + ' days')}`;
  document.getElementById('txModal').classList.add('open');
}

function row(k, v) { return `<div class="modal-row"><span class="modal-key">${k}</span><span class="modal-val">${v}</span></div>`; }
function closeModal() { document.getElementById('txModal').classList.remove('open'); }

// ── Charts ─────────────────────────────────────────────────────────────────
function chartDefaults() {
  return {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1d35', titleColor: '#e2e4f0', bodyColor: '#9ca3af', borderColor: '#252840', borderWidth: 1 } },
    scales: { x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6b7280', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6b7280', font: { size: 11 } } } }
  };
}

function initCharts() {
  // Trend
  const tCtx = document.getElementById('trendChart').getContext('2d');
  const grad1 = tCtx.createLinearGradient(0, 0, 0, 300);
  grad1.addColorStop(0, 'rgba(99,102,241,.3)'); grad1.addColorStop(1, 'rgba(99,102,241,0)');
  const grad2 = tCtx.createLinearGradient(0, 0, 0, 300);
  grad2.addColorStop(0, 'rgba(239,68,68,.4)'); grad2.addColorStop(1, 'rgba(239,68,68,0)');
  charts.trend = new Chart(tCtx, {
    type: 'line',
    data: {
      labels: TREND_LABELS,
      datasets: [
        { label: 'Normal', data: TREND_NORMAL, borderColor: '#6366f1', backgroundColor: grad1, fill: true, tension: 0.4, pointRadius: 3 },
        { label: 'Fraud', data: TREND_FRAUD, borderColor: '#ef4444', backgroundColor: grad2, fill: true, tension: 0.4, pointRadius: 3 }
      ]
    },
    options: { ...chartDefaults(), plugins: { ...chartDefaults().plugins, legend: { display: false } } }
  });

  // Category donut
  charts.category = new Chart(document.getElementById('categoryChart').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: CATEGORY_LABELS,
      datasets: [{ data: CATEGORY_DATA, backgroundColor: ['#6366f1','#ec4899','#ef4444','#f59e0b','#10b981'], borderWidth: 0, hoverOffset: 6 }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', padding: 12, font: { size: 12 } } }, tooltip: chartDefaults().plugins.tooltip } }
  });

  // Risk distribution bar
  charts.riskDist = new Chart(document.getElementById('riskDistChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: RISK_BANDS,
      datasets: [{ data: RISK_DATA, backgroundColor: ['#10b981','#6366f1','#f59e0b','#f97316','#ef4444'], borderRadius: 6, borderSkipped: false }]
    },
    options: chartDefaults()
  });

  // Heatmap (bar chart for hourly)
  const hours = Array.from({ length: 24 }, (_, i) => i + ':00');
  charts.heatmap = new Chart(document.getElementById('heatmapChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: hours,
      datasets: [{ data: HOURLY_FRAUD, backgroundColor: HOURLY_FRAUD.map(v => `rgba(239,68,68,${0.2 + v / 60})`), borderRadius: 4, borderSkipped: false }]
    },
    options: { ...chartDefaults(), plugins: { ...chartDefaults().plugins, tooltip: { ...chartDefaults().plugins.tooltip, callbacks: { label: ctx => ctx.parsed.y + ' fraud events' } } } }
  });
}

// ── ML Predict UI ──────────────────────────────────────────────────────────
function predictFraud() {
  const features = {
    amount: parseFloat(document.getElementById('mlAmount').value) || 0,
    hour: parseInt(document.getElementById('mlHour').value) || 0,
    velocity: parseInt(document.getElementById('mlVelocity').value) || 0,
    accountAge: parseInt(document.getElementById('mlAge').value) || 365,
    countryRisk: parseInt(document.getElementById('mlCountry').value),
    newDevice: parseInt(document.getElementById('mlNewDevice').value),
    vpn: parseInt(document.getElementById('mlVPN').value),
    category: document.getElementById('mlCategory').value,
  };
  const result = mlPredict(features);
  renderPredictionResult(result);
}

function renderPredictionResult(r) {
  const color = r.score >= 80 ? '#ef4444' : r.score >= 50 ? '#f59e0b' : '#10b981';
  document.getElementById('gaugeLabel').textContent = r.score + ' / 100';
  document.getElementById('gaugeLabel').style.color = color;

  if (gaugeChart) gaugeChart.destroy();
  const ctx = document.getElementById('gaugeChart').getContext('2d');
  gaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [r.score, 100 - r.score],
        backgroundColor: [color, 'rgba(255,255,255,.06)'],
        borderWidth: 0, circumference: 180, rotation: -90
      }]
    },
    options: { responsive: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
  });

  const verdict = r.isFraud ? '🚨 FRAUD DETECTED' : '✅ LEGITIMATE';
  const vColor = r.isFraud ? '#ef4444' : '#10b981';
  document.getElementById('predictionBadges').innerHTML = `
    <span class="pred-badge" style="background:${vColor}22;color:${vColor};border:1px solid ${vColor}44">${verdict}</span>
    <span class="pred-badge" style="background:rgba(99,102,241,.15);color:#6366f1">Confidence: ${r.confidence}%</span>`;

  document.getElementById('featureImportance').innerHTML = r.importance.map(f => `
    <div class="fi-item">
      <span class="fi-label">${f.name}</span>
      <div class="fi-bar-wrap"><div class="fi-bar" style="width:${f.value * 3}%;background:${f.color}"></div></div>
      <span class="fi-val">${f.value}%</span>
    </div>`).join('');
}

// ── Risk Section ───────────────────────────────────────────────────────────
function initRiskSection() {
  const sysScore = 42;
  document.getElementById('systemRiskScore').textContent = sysScore;
  document.getElementById('systemRiskScore').style.color = '#f59e0b';

  const factors = [
    { name: 'Unusual Night Activity', score: 68, color: '#ef4444' },
    { name: 'High Velocity Accounts', score: 54, color: '#f59e0b' },
    { name: 'New Device Logins', score: 45, color: '#6366f1' },
    { name: 'VPN/Proxy Usage', score: 38, color: '#8b5cf6' },
    { name: 'High-Risk Geographies', score: 61, color: '#ec4899' },
    { name: 'Large Wire Transfers', score: 49, color: '#10b981' },
  ];
  document.getElementById('riskFactorList').innerHTML = factors.map(f => `
    <div class="risk-factor-item">
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between"><span class="rf-name">${f.name}</span><span class="rf-score" style="color:${f.color}">${f.score}</span></div>
        <div class="rf-bar" style="width:${f.score}%;background:${f.color}"></div>
      </div>
    </div>`).join('');

  const profiles = [
    { name: 'ACC-00123', score: 88, label: 'CRITICAL', color: '#ef4444', txns: 47 },
    { name: 'ACC-00456', score: 72, label: 'HIGH', color: '#f97316', txns: 31 },
    { name: 'ACC-00789', score: 61, label: 'HIGH', color: '#f59e0b', txns: 22 },
    { name: 'ACC-00321', score: 44, label: 'MEDIUM', color: '#6366f1', txns: 18 },
    { name: 'ACC-00654', score: 29, label: 'LOW', color: '#10b981', txns: 9 },
    { name: 'ACC-00987', score: 15, label: 'LOW', color: '#10b981', txns: 5 },
  ];
  document.getElementById('riskProfilesGrid').innerHTML = profiles.map(p => `
    <div class="profile-card">
      <div class="profile-name">${p.name}</div>
      <div class="profile-score" style="color:${p.color}">${p.score}</div>
      <div class="profile-meta">${p.label} RISK · ${p.txns} transactions</div>
    </div>`).join('');

  const riskDates = ['May 10','May 11','May 12','May 13','May 14','May 15','May 16'];
  const riskVals  = [35, 42, 38, 55, 48, 61, 42];
  charts.riskTime = new Chart(document.getElementById('riskTimeChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: riskDates,
      datasets: [{ data: riskVals, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#f59e0b' }]
    },
    options: chartDefaults()
  });
}

// ── Patterns Section ───────────────────────────────────────────────────────
function initPatternsSection() {
  const hours = Array.from({ length: 24 }, (_, i) => i + ':00');
  charts.timePattern = new Chart(document.getElementById('timePatternChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: hours,
      datasets: [{ data: HOURLY_FRAUD, borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,.1)', fill: true, tension: 0.4, pointRadius: 3 }]
    },
    options: chartDefaults()
  });

  const amtBands = ['$0-100','$100-500','$500-1K','$1K-5K','$5K+'];
  const amtFraud = [5, 18, 35, 62, 80];
  const amtLegit = [320, 280, 180, 95, 30];
  charts.amtDist = new Chart(document.getElementById('amountDistChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: amtBands,
      datasets: [
        { label: 'Legitimate', data: amtLegit, backgroundColor: 'rgba(99,102,241,.6)', borderRadius: 4 },
        { label: 'Fraud', data: amtFraud, backgroundColor: 'rgba(239,68,68,.7)', borderRadius: 4 }
      ]
    },
    options: { ...chartDefaults(), plugins: { ...chartDefaults().plugins, legend: { display: true, labels: { color: '#9ca3af' } } } }
  });

  // Geo map dots
  const geoPoints = [
    { top: '30%', left: '22%', size: 12, color: '#6366f1', label: 'US' },
    { top: '28%', left: '48%', size: 8, color: '#6366f1', label: 'UK' },
    { top: '55%', left: '52%', size: 18, color: '#ef4444', label: 'NG' },
    { top: '32%', left: '62%', size: 14, color: '#ef4444', label: 'RU' },
    { top: '38%', left: '72%', size: 16, color: '#f59e0b', label: 'CN' },
    { top: '62%', left: '35%', size: 14, color: '#f59e0b', label: 'BR' },
    { top: '40%', left: '78%', size: 10, color: '#6366f1', label: 'JP' },
    { top: '44%', left: '67%', size: 12, color: '#f97316', label: 'IN' },
  ];
  document.getElementById('geoMap').innerHTML = geoPoints.map(p => `
    <div class="geo-dot" style="top:${p.top};left:${p.left};width:${p.size}px;height:${p.size}px;background:${p.color};opacity:.8;box-shadow:0 0 ${p.size * 2}px ${p.color}" title="${p.label}"></div>`).join('');

  // Network anomaly chart
  const netLabels = ['May 10','May 11','May 12','May 13','May 14','May 15'];
  charts.network = new Chart(document.getElementById('networkChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: netLabels,
      datasets: [
        { label: 'Anomaly Score', data: [22, 28, 35, 80, 55, 42], borderColor: '#ef4444', tension: 0.4, borderWidth: 2, pointRadius: 5, pointBackgroundColor: '#ef4444' },
        { label: 'Baseline', data: [25, 25, 25, 25, 25, 25], borderColor: '#6366f1', borderDash: [6, 4], tension: 0, pointRadius: 0, borderWidth: 1.5 }
      ]
    },
    options: { ...chartDefaults(), plugins: { ...chartDefaults().plugins, legend: { display: true, labels: { color: '#9ca3af' } } } }
  });

  const insights = [
    { cls: 'danger', title: '🚨 Card-Not-Present Spike', desc: '+340% increase in CNP fraud over 48 hours vs baseline.' },
    { cls: 'warn',   title: '⚠️ Velocity Ring Detected', desc: '12 accounts sharing IP 192.168.x.x, high transaction burst.' },
    { cls: 'warn',   title: '⚠️ Geographic Anomaly', desc: 'Same card used in US and NG within 2 hours.' },
    { cls: '',       title: '📊 Night-Hour Concentration', desc: '63% of fraud events occur between 01:00 – 05:00 AM.' },
    { cls: 'danger', title: '🚨 Account Takeover Pattern', desc: 'Password resets followed by large wire transfers detected.' },
    { cls: '',       title: '🔍 Small-Amount Probing', desc: 'Series of sub-$1 transactions before large withdrawals.' },
  ];
  document.getElementById('insightsGrid').innerHTML = insights.map(i => `
    <div class="insight-card ${i.cls}">
      <div class="insight-title">${i.title}</div>
      <div class="insight-desc">${i.desc}</div>
    </div>`).join('');
}

// ── Alerts Page ────────────────────────────────────────────────────────────
function renderAlertsPage() {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  alerts.forEach(a => counts[a.severity]++);
  document.getElementById('countCritical').textContent = counts.critical + ' Critical';
  document.getElementById('countHigh').textContent = counts.high + ' High';
  document.getElementById('countMedium').textContent = counts.medium + ' Medium';
  document.getElementById('countLow').textContent = counts.low + ' Low';
  document.getElementById('alertsFullList').innerHTML = alerts.map(a => alertHTML(a)).join('');
}

function clearAlerts() {
  alerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
  renderAlertsPage();
  renderRecentAlerts();
}

// ── Scan Animation ─────────────────────────────────────────────────────────
function runFraudScan() {
  const overlay = document.getElementById('scanOverlay');
  overlay.classList.add('open');
  const fill = document.getElementById('scanFill');
  const pct  = document.getElementById('scanPercent');
  const status = document.getElementById('scanStatus');
  const steps = ['Initializing XGBoost model...','Loading transaction features...','Running feature extraction...','Applying risk scoring...','Cross-referencing blacklists...','Detecting behavioral anomalies...','Generating fraud predictions...','Finalizing results...'];
  let prog = 0, step = 0;
  const iv = setInterval(() => {
    prog = Math.min(100, prog + Math.random() * 14);
    fill.style.width = prog + '%';
    pct.textContent = Math.floor(prog) + '%';
    if (step < steps.length) { status.textContent = steps[step++]; }
    if (prog >= 100) {
      clearInterval(iv);
      // Add a few new transactions
      for (let i = 0; i < 5; i++) generateNewTransaction();
      setTimeout(() => {
        overlay.classList.remove('open');
        fill.style.width = '0%';
        pct.textContent = '0%';
      }, 600);
    }
  }, 280);
}

// ── Live Update ────────────────────────────────────────────────────────────
function liveUpdate() {
  const t = generateTransaction(transactions.length + 1);
  t.riskScore = scoreTransaction(t).score;
  t.isFraud = t.riskScore >= 50;
  t.status = t.isFraud ? 'fraud' : (t.riskScore > 35 ? 'review' : 'legitimate');
  transactions.unshift(t);
  if (transactions.length > 500) transactions.pop();
  if (t.isFraud) {
    alerts.unshift({ id: t.id, severity: t.riskScore >= 90 ? 'critical' : 'high', title: 'Live fraud: ' + t.id, desc: '$' + t.amount.toFixed(2) + ' · ' + t.location, time: 'just now', resolved: false });
  }
  updateKPIs();
  if (document.getElementById('section-dashboard').classList.contains('active')) {
    renderRecentAlerts();
  }
  if (document.getElementById('section-transactions').classList.contains('active')) {
    renderTransactionTable();
  }
  if (document.getElementById('section-alerts').classList.contains('active')) {
    renderAlertsPage();
  }
}
