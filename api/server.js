const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;

const dataDir = path.join(__dirname, 'data');
const demoDir = path.join(__dirname, '..', 'demo');
const defaultPortfolio = JSON.parse(fs.readFileSync(path.join(dataDir, 'default-portfolio.json'), 'utf8'));
const assetCatalog = JSON.parse(fs.readFileSync(path.join(dataDir, 'assets-catalog.json'), 'utf8'));
const walletPortfolios = JSON.parse(fs.readFileSync(path.join(dataDir, 'wallet-portfolios.json'), 'utf8'));

function sendFile(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType
    });
    res.end(content);
  } catch (err) {
    sendJson(res, 404, {
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'Requested static asset not found'
      }
    });
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function enrichPortfolio(portfolio) {
  const catalogBySymbol = new Map(assetCatalog.map((item) => [item.symbol, item]));
  const holdings = portfolio.holdings.map((holding) => {
    const meta = catalogBySymbol.get(holding.symbol) || {};
    const value = Number((holding.quantity * holding.price).toFixed(2));
    return {
      ...holding,
      ...meta,
      value
    };
  });

  const totalValue = Number(holdings.reduce((sum, item) => sum + item.value, 0).toFixed(2));

  const classTotals = holdings.reduce((acc, item) => {
    const key = item.assetClass || 'Other';
    acc[key] = (acc[key] || 0) + item.value;
    return acc;
  }, {});

  const allocation = Object.entries(classTotals).map(([assetClass, value]) => ({
    assetClass,
    value: Number(value.toFixed(2)),
    percent: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(2)) : 0
  }));

  const weightedYield = holdings.reduce((sum, item) => {
    const apy = Number(item.indicativeApy || 0);
    if (totalValue === 0) return sum;
    return sum + (item.value / totalValue) * apy;
  }, 0);

  return {
    ...portfolio,
    holdings,
    summary: {
      totalValue,
      blendedYield: Number(weightedYield.toFixed(2)),
      referenceTBillRate: portfolio.referenceTBillRate,
      yieldSpread: Number((weightedYield - portfolio.referenceTBillRate).toFixed(2))
    },
    allocation
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'wealth-wellness-hub-api',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/demo' || url.pathname === '/demo/')) {
    sendFile(res, path.join(demoDir, 'index.html'), 'text/html; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/demo/styles.css') {
    sendFile(res, path.join(demoDir, 'styles.css'), 'text/css; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/styles.css') {
    sendFile(res, path.join(demoDir, 'styles.css'), 'text/css; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/demo/app.js') {
    sendFile(res, path.join(demoDir, 'app.js'), 'application/javascript; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/app.js') {
    sendFile(res, path.join(demoDir, 'app.js'), 'application/javascript; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/demo/data/defaultPortfolio.js') {
    sendFile(res, path.join(demoDir, 'data', 'defaultPortfolio.js'), 'application/javascript; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/data/defaultPortfolio.js') {
    sendFile(res, path.join(demoDir, 'data', 'defaultPortfolio.js'), 'application/javascript; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/assets/catalog') {
    sendJson(res, 200, {
      data: assetCatalog
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/portfolio/default') {
    sendJson(res, 200, {
      data: enrichPortfolio(defaultPortfolio)
    });
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/portfolio/wallet/')) {
    const walletAddress = decodeURIComponent(url.pathname.replace('/api/portfolio/wallet/', '')).toLowerCase();
    const raw = walletPortfolios[walletAddress];
    if (!raw) {
      sendJson(res, 404, {
        error: {
          code: 'NOT_FOUND',
          message: `No portfolio found for wallet ${walletAddress}`
        }
      });
      return;
    }

    sendJson(res, 200, {
      data: enrichPortfolio(raw)
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/yield/reference') {
    sendJson(res, 200, {
      data: {
        referenceTBillRate: defaultPortfolio.referenceTBillRate,
        asOf: defaultPortfolio.asOf,
        source: 'Mock seeding-round reference rate'
      }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/portfolio/value') {
    try {
      const body = await parseBody(req);
      if (!Array.isArray(body.holdings)) {
        sendJson(res, 400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'holdings must be an array'
          }
        });
        return;
      }

      const inputPortfolio = {
        walletAddress: body.walletAddress || 'ad-hoc-input',
        asOf: new Date().toISOString(),
        baseCurrency: 'USD',
        referenceTBillRate: Number(body.referenceTBillRate || defaultPortfolio.referenceTBillRate),
        holdings: body.holdings.map((h) => ({
          symbol: h.symbol,
          quantity: Number(h.quantity || 0),
          price: Number(h.price || 0),
          assetClass: h.assetClass || 'Other'
        }))
      };

      sendJson(res, 200, {
        data: enrichPortfolio(inputPortfolio)
      });
    } catch (err) {
      sendJson(res, 400, {
        error: {
          code: 'INVALID_JSON',
          message: err.message
        }
      });
    }
    return;
  }

  sendJson(res, 404, {
    error: {
      code: 'NOT_FOUND',
      message: `No route for ${req.method} ${url.pathname}`
    }
  });
});

server.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
