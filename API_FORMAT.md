# API Format and Contract (MVP)

Base URL: `http://localhost:8787`
Content-Type: `application/json`

## 1) GET `/api/health`

Response 200:
```json
{
  "status": "ok",
  "service": "wealth-wellness-hub-api",
  "timestamp": "2026-03-06T10:00:00.000Z"
}
```

## 2) GET `/api/assets/catalog`

Response 200:
```json
{
  "data": [
    {
      "symbol": "PAXG",
      "name": "Pax Gold",
      "assetClass": "Gold & Commodities",
      "issuer": "Paxos",
      "compliance": "Permissionless",
      "indicativeApy": 0,
      "unitHint": "1 token ~= 1 troy oz gold"
    }
  ]
}
```

## 3) GET `/api/portfolio/default`

Response 200:
```json
{
  "data": {
    "walletAddress": "demo-local-wallet",
    "summary": {
      "totalValue": 21136.5,
      "blendedYield": 4.69,
      "referenceTBillRate": 5.1,
      "yieldSpread": -0.41
    },
    "allocation": [
      {
        "assetClass": "Fixed Income",
        "value": 16000,
        "percent": 75.7
      }
    ],
    "holdings": []
  }
}
```

## 4) GET `/api/portfolio/wallet/{walletAddress}`

Response 200:
```json
{
  "data": {
    "walletAddress": "0xdemo123",
    "summary": {
      "totalValue": 10707.09,
      "blendedYield": 4.37,
      "referenceTBillRate": 5.1,
      "yieldSpread": -0.73
    },
    "allocation": [],
    "holdings": []
  }
}
```

Response 404:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No portfolio found for wallet ..."
  }
}
```

## 5) GET `/api/yield/reference`

Response 200:
```json
{
  "data": {
    "referenceTBillRate": 5.1,
    "asOf": "2026-03-06T09:00:00Z",
    "source": "Mock seeding-round reference rate"
  }
}
```

## 6) POST `/api/portfolio/value`

Request body:
```json
{
  "walletAddress": "0xabc",
  "referenceTBillRate": 5.1,
  "holdings": [
    {
      "symbol": "PAXG",
      "quantity": 0.2,
      "price": 5173,
      "assetClass": "Gold & Commodities"
    }
  ]
}
```

Response 200:
```json
{
  "data": {
    "walletAddress": "0xabc",
    "summary": {
      "totalValue": 1034.6,
      "blendedYield": 0,
      "referenceTBillRate": 5.1,
      "yieldSpread": -5.1
    },
    "allocation": [],
    "holdings": []
  }
}
```

Response 400:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "holdings must be an array"
  }
}
```
