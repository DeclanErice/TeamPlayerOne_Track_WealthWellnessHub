const state = {
  source: 'local',
  walletConnected: false,
  portfolio: null,
  distributionView: 'allocation',
  query: '',
  classFilter: 'all',
  complianceFilter: 'all',
  sortBy: 'value_desc',
  collapsedGroups: {}
};

// Dashboard rules configuration.
// How to use:
// 1) Tune per-asset-class base risk in RISK_RULES.classBaseScore.
// 2) Add or edit score adjustments in RISK_RULES.adjustments to match your policy.
// 3) Change RISK_RULES.min/max if you adopt a different score range.
// 4) Update LIQUIDITY_RULES.byAssetClass to map each asset class to your liquidity tiers.
// 5) No rendering code changes are needed after updating this config; reloading the page applies new rules.
const RISK_RULES = {
  classBaseScore: {
    'Fixed Income': 2,
    'Gold & Commodities': 3,
    'Real Estate': 4
  },
  adjustments: [
    {
      name: 'permissionlessPremium',
      when: (holding) => (holding.compliance || '').toLowerCase().includes('permissionless'),
      delta: 0.4
    },
    {
      name: 'highApyPremium',
      when: (holding) => Number(holding.indicativeApy || 0) >= 5.5,
      delta: 0.4
    },
    {
      name: 'lowApyDiscount',
      when: (holding) => Number(holding.indicativeApy || 0) <= 1,
      delta: -0.3
    }
  ],
  min: 1,
  max: 5
};

const LIQUIDITY_RULES = {
  byAssetClass: {
    'Fixed Income': 'High',
    'Gold & Commodities': 'Medium',
    'Real Estate': 'Low'
  },
  fallback: 'Medium'
};

const el = {
  loadLocalBtn: document.getElementById('loadLocalBtn'),
  loadApiBtn: document.getElementById('loadApiBtn'),
  connectBtn: document.getElementById('connectBtn'),
  viewAllocationBtn: document.getElementById('viewAllocationBtn'),
  viewContributionBtn: document.getElementById('viewContributionBtn'),
  searchInput: document.getElementById('searchInput'),
  classFilter: document.getElementById('classFilter'),
  complianceFilter: document.getElementById('complianceFilter'),
  sortBy: document.getElementById('sortBy'),
  totalValue: document.getElementById('totalValue'),
  blendedYield: document.getElementById('blendedYield'),
  spreadValue: document.getElementById('spreadValue'),
  annualIncome: document.getElementById('annualIncome'),
  concentrationValue: document.getElementById('concentrationValue'),
  riskValue: document.getElementById('riskValue'),
  distributionList: document.getElementById('distributionList'),
  holdingsBody: document.getElementById('holdingsBody'),
  alertsList: document.getElementById('alertsList'),
  status: document.getElementById('status')
};

function formatUSD(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value || 0);
}

function formatPct(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function getRiskScore(holding) {
  // Rule-based scoring keeps risk transparent in MVP and easy to tune via RISK_RULES.
  let score = RISK_RULES.classBaseScore[holding.assetClass] || 3;

  RISK_RULES.adjustments.forEach((rule) => {
    if (rule.when(holding)) score += rule.delta;
  });

  return Number(Math.min(RISK_RULES.max, Math.max(RISK_RULES.min, score)).toFixed(1));
}

function getLiquidityTier(assetClass) {
  return LIQUIDITY_RULES.byAssetClass[assetClass] || LIQUIDITY_RULES.fallback;
}

function toEnrichedPortfolio(input) {
  const holdings = (input.holdings || []).map((h) => ({
    ...h,
    value: Number((h.quantity * h.price).toFixed(2)),
    riskScore: getRiskScore(h),
    liquidityTier: getLiquidityTier(h.assetClass)
  }));

  const totalValue = Number(holdings.reduce((sum, h) => sum + h.value, 0).toFixed(2));
  const blendedYield = holdings.reduce((sum, h) => {
    if (totalValue === 0) return sum;
    return sum + ((h.value / totalValue) * Number(h.indicativeApy || 0));
  }, 0);

  const enrichedHoldings = holdings.map((h) => {
    const allocationPct = totalValue > 0 ? Number(((h.value / totalValue) * 100).toFixed(2)) : 0;
    const estimatedAnnualIncome = Number((h.value * (Number(h.indicativeApy || 0) / 100)).toFixed(2));
    return {
      ...h,
      allocationPct,
      estimatedAnnualIncome
    };
  });

  const classMap = {};
  enrichedHoldings.forEach((h) => {
    if (!classMap[h.assetClass]) {
      classMap[h.assetClass] = {
        value: 0,
        annualIncome: 0,
        weightedRisk: 0,
        weightedApy: 0
      };
    }

    classMap[h.assetClass].value += h.value;
    classMap[h.assetClass].annualIncome += h.estimatedAnnualIncome;
    classMap[h.assetClass].weightedRisk += h.riskScore * h.value;
    classMap[h.assetClass].weightedApy += Number(h.indicativeApy || 0) * h.value;
  });

  const allocation = Object.entries(classMap).map(([assetClass, data]) => {
    const percent = totalValue > 0 ? Number(((data.value / totalValue) * 100).toFixed(2)) : 0;
    return {
      assetClass,
      value: Number(data.value.toFixed(2)),
      percent,
      annualIncome: Number(data.annualIncome.toFixed(2)),
      annualIncomeShare: 0,
      classRisk: data.value > 0 ? Number((data.weightedRisk / data.value).toFixed(1)) : 0,
      classApy: data.value > 0 ? Number((data.weightedApy / data.value).toFixed(2)) : 0
    };
  });

  const totalAnnualIncome = Number(allocation.reduce((sum, a) => sum + a.annualIncome, 0).toFixed(2));
  allocation.forEach((a) => {
    a.annualIncomeShare = totalAnnualIncome > 0 ? Number(((a.annualIncome / totalAnnualIncome) * 100).toFixed(2)) : 0;
  });

  const largestPositionPct = enrichedHoldings.length > 0 ? Math.max(...enrichedHoldings.map((h) => h.allocationPct)) : 0;
  const weightedRiskScore = totalValue > 0
    ? Number((enrichedHoldings.reduce((sum, h) => sum + (h.riskScore * h.value), 0) / totalValue).toFixed(1))
    : 0;

  return {
    ...input,
    summary: {
      totalValue,
      blendedYield: Number(blendedYield.toFixed(2)),
      referenceTBillRate: input.referenceTBillRate || 5.1,
      yieldSpread: Number((blendedYield - (input.referenceTBillRate || 5.1)).toFixed(2)),
      totalAnnualIncome,
      largestPositionPct: Number(largestPositionPct.toFixed(2)),
      weightedRiskScore
    },
    holdings: enrichedHoldings,
    allocation
  };
}

function ensureFilterOptions() {
  if (!state.portfolio) return;

  const classes = Array.from(new Set(state.portfolio.holdings.map((h) => h.assetClass))).sort();
  const complianceTags = Array.from(new Set(state.portfolio.holdings.map((h) => h.compliance || 'Unknown'))).sort();

  el.classFilter.innerHTML = '<option value="all">All Asset Classes</option>';
  classes.forEach((assetClass) => {
    const option = document.createElement('option');
    option.value = assetClass;
    option.textContent = assetClass;
    el.classFilter.appendChild(option);
  });

  el.complianceFilter.innerHTML = '<option value="all">All Compliance Tags</option>';
  complianceTags.forEach((tag) => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    el.complianceFilter.appendChild(option);
  });

  el.classFilter.value = state.classFilter;
  el.complianceFilter.value = state.complianceFilter;
  el.searchInput.value = state.query;
  el.sortBy.value = state.sortBy;
}

function getRiskClass(score) {
  if (score >= 3.8) return 'risk-high';
  if (score >= 2.8) return 'risk-mid';
  return 'risk-low';
}

function getFilteredAndSortedHoldings() {
  if (!state.portfolio) return [];

  const query = state.query.trim().toLowerCase();
  let list = state.portfolio.holdings.filter((h) => {
    const byClass = state.classFilter === 'all' || h.assetClass === state.classFilter;
    const byCompliance = state.complianceFilter === 'all' || (h.compliance || 'Unknown') === state.complianceFilter;
    const byQuery = !query
      || (h.symbol || '').toLowerCase().includes(query)
      || (h.name || '').toLowerCase().includes(query)
      || (h.issuer || '').toLowerCase().includes(query);

    return byClass && byCompliance && byQuery;
  });

  const sortMap = {
    value_desc: (a, b) => b.value - a.value,
    value_asc: (a, b) => a.value - b.value,
    allocation_desc: (a, b) => b.allocationPct - a.allocationPct,
    apy_desc: (a, b) => Number(b.indicativeApy || 0) - Number(a.indicativeApy || 0),
    risk_desc: (a, b) => b.riskScore - a.riskScore
  };

  const sorter = sortMap[state.sortBy] || sortMap.value_desc;
  list = list.sort(sorter);

  return list;
}

function renderDistribution() {
  const data = state.portfolio.allocation || [];
  el.distributionList.innerHTML = '';

  data.forEach((item) => {
    const metric = state.distributionView === 'allocation' ? item.percent : item.annualIncomeShare;
    const valueLabel = state.distributionView === 'allocation'
      ? `${formatPct(item.percent)} (${formatUSD(item.value)})`
      : `${formatPct(item.annualIncomeShare)} (${formatUSD(item.annualIncome)} / year)`;

    const row = document.createElement('div');
    row.className = 'allocation-row';
    row.innerHTML = `
      <div><strong>${item.assetClass}</strong></div>
      <div class="bar-wrap"><div class="bar" style="width:${Math.max(metric, 3)}%"></div></div>
      <div class="muted">${valueLabel}</div>
    `;
    el.distributionList.appendChild(row);
  });
}

function renderHoldingsTable() {
  const holdings = getFilteredAndSortedHoldings();
  const grouped = {};

  holdings.forEach((h) => {
    if (!grouped[h.assetClass]) grouped[h.assetClass] = [];
    grouped[h.assetClass].push(h);
  });

  el.holdingsBody.innerHTML = '';

  if (holdings.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="9" class="muted">No holdings match current filters.</td>';
    el.holdingsBody.appendChild(row);
    return;
  }

  Object.entries(grouped).forEach(([assetClass, rows]) => {
    const isCollapsed = Boolean(state.collapsedGroups[assetClass]);
    const groupValue = rows.reduce((sum, h) => sum + h.value, 0);
    const groupAllocation = state.portfolio.summary.totalValue > 0
      ? (groupValue / state.portfolio.summary.totalValue) * 100
      : 0;

    const groupRow = document.createElement('tr');
    groupRow.className = 'group-row';
    groupRow.innerHTML = `
      <td colspan="9">
        <button class="group-toggle" data-asset-class="${assetClass}" aria-expanded="${String(!isCollapsed)}">
          <span class="caret">${isCollapsed ? '▸' : '▾'}</span>
          <span>${assetClass} | ${formatUSD(groupValue)} | ${formatPct(groupAllocation)}</span>
        </button>
      </td>
    `;
    el.holdingsBody.appendChild(groupRow);

    if (isCollapsed) return;

    rows.forEach((h) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="asset-name">
            <span class="symbol">${h.symbol}</span>
            <span class="muted">${h.name || h.symbol}</span>
          </div>
        </td>
        <td>${h.issuer || 'N/A'}</td>
        <td>${formatUSD(h.value)}</td>
        <td>${formatPct(h.allocationPct)}</td>
        <td>${formatPct(h.indicativeApy || 0)}</td>
        <td>${formatUSD(h.estimatedAnnualIncome)}</td>
        <td class="${getRiskClass(h.riskScore)}">${h.riskScore.toFixed(1)} / 5</td>
        <td>${h.liquidityTier}</td>
        <td><span class="tag">${h.compliance || 'Unknown'}</span></td>
      `;
      el.holdingsBody.appendChild(row);
    });
  });
}

function buildAlerts(portfolio) {
  // Rules-based alerts provide immediate guidance before adding ML recommendations.
  const alerts = [];
  const spread = portfolio.summary.yieldSpread;
  const concentration = portfolio.summary.largestPositionPct;
  const weightedRisk = portfolio.summary.weightedRiskScore;

  if (spread < 0) {
    alerts.push(`Yield spread is negative (${formatPct(spread)} vs T-bill). Review low-yield positions.`);
  }

  if (concentration >= 40) {
    alerts.push(`Largest position concentration is ${formatPct(concentration)}. Consider diversification.`);
  }

  if (weightedRisk >= 3.5) {
    alerts.push(`Portfolio risk score is ${weightedRisk.toFixed(1)} / 5. Monitor drawdown sensitivity.`);
  }

  const permissionedShare = portfolio.holdings
    .filter((h) => (h.compliance || '').toLowerCase().includes('permission'))
    .reduce((sum, h) => sum + h.value, 0);
  const permissionedSharePct = portfolio.summary.totalValue > 0
    ? Number(((permissionedShare / portfolio.summary.totalValue) * 100).toFixed(2))
    : 0;
  if (permissionedSharePct >= 60) {
    alerts.push(`Permissioned exposure is ${formatPct(permissionedSharePct)}. Liquidity windows may be tighter.`);
  }

  if (alerts.length === 0) {
    alerts.push('No critical alerts. Portfolio allocation appears balanced for current rules.');
  }

  return alerts;
}

function render() {
  const portfolio = state.portfolio;
  if (!portfolio) return;

  const spreadClass = portfolio.summary.yieldSpread >= 0 ? 'spread-pos' : 'spread-neg';

  el.totalValue.textContent = formatUSD(portfolio.summary.totalValue);
  el.blendedYield.textContent = formatPct(portfolio.summary.blendedYield);
  el.spreadValue.textContent = `${portfolio.summary.yieldSpread >= 0 ? '+' : ''}${formatPct(portfolio.summary.yieldSpread)} vs T-bill (${formatPct(portfolio.summary.referenceTBillRate)})`;
  el.spreadValue.className = spreadClass;
  el.annualIncome.textContent = formatUSD(portfolio.summary.totalAnnualIncome);
  el.concentrationValue.textContent = formatPct(portfolio.summary.largestPositionPct);
  el.riskValue.textContent = `${portfolio.summary.weightedRiskScore.toFixed(1)} / 5`;

  el.viewAllocationBtn.classList.toggle('is-active', state.distributionView === 'allocation');
  el.viewContributionBtn.classList.toggle('is-active', state.distributionView === 'contribution');

  ensureFilterOptions();
  renderDistribution();
  renderHoldingsTable();

  const alerts = buildAlerts(portfolio);
  el.alertsList.innerHTML = '';
  alerts.forEach((message) => {
    const item = document.createElement('li');
    item.textContent = message;
    el.alertsList.appendChild(item);
  });

  const sourceLabel = state.source === 'api' ? 'API data' : 'local default data';
  const walletLabel = state.walletConnected ? 'wallet connected (demo)' : 'wallet not connected';
  el.status.textContent = `Showing ${sourceLabel}; ${walletLabel}; as of ${portfolio.asOf}`;
}

function loadLocal() {
  state.source = 'local';
  state.portfolio = toEnrichedPortfolio(window.DEFAULT_PORTFOLIO);
  render();
}

async function loadFromApi() {
  try {
    const response = await fetch('http://localhost:8787/api/portfolio/default');
    if (!response.ok) {
      throw new Error('API not reachable');
    }
    const payload = await response.json();
    state.source = 'api';
    state.portfolio = payload.data;
    render();
  } catch (err) {
    state.source = 'local';
    state.portfolio = toEnrichedPortfolio(window.DEFAULT_PORTFOLIO);
    render();
    el.status.textContent = `API unavailable, fallback to local default data. Reason: ${err.message}`;
  }
}

el.loadLocalBtn.addEventListener('click', loadLocal);
el.loadApiBtn.addEventListener('click', loadFromApi);
el.connectBtn.addEventListener('click', () => {
  state.walletConnected = true;
  render();
});

el.viewAllocationBtn.addEventListener('click', () => {
  state.distributionView = 'allocation';
  render();
});

el.viewContributionBtn.addEventListener('click', () => {
  state.distributionView = 'contribution';
  render();
});

el.searchInput.addEventListener('input', (event) => {
  state.query = event.target.value || '';
  renderHoldingsTable();
});

el.classFilter.addEventListener('change', (event) => {
  state.classFilter = event.target.value;
  renderHoldingsTable();
});

el.complianceFilter.addEventListener('change', (event) => {
  state.complianceFilter = event.target.value;
  renderHoldingsTable();
});

el.sortBy.addEventListener('change', (event) => {
  state.sortBy = event.target.value;
  renderHoldingsTable();
});

el.holdingsBody.addEventListener('click', (event) => {
  const toggle = event.target.closest('.group-toggle');
  if (!toggle) return;

  const assetClass = toggle.getAttribute('data-asset-class');
  if (!assetClass) return;

  state.collapsedGroups[assetClass] = !state.collapsedGroups[assetClass];
  renderHoldingsTable();
});

loadLocal();
