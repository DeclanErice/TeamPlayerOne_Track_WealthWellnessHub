window.DEFAULT_PORTFOLIO = {
  walletAddress: 'demo-local-wallet',
  asOf: '2026-03-06T09:00:00Z',
  referenceTBillRate: 5.1,
  holdings: [
    {
      symbol: 'PAXG',
      name: 'Pax Gold',
      assetClass: 'Gold & Commodities',
      issuer: 'Paxos',
      compliance: 'Permissionless',
      indicativeApy: 0,
      quantity: 0.5,
      price: 5173.0,
      unitHint: '1 token ~= 1 troy oz gold'
    },
    {
      symbol: 'USYC',
      name: 'Hashnote International Short Duration Yield Coin',
      assetClass: 'Fixed Income',
      issuer: 'Hashnote',
      compliance: 'KYC Required',
      indicativeApy: 5.2,
      quantity: 12000,
      price: 1.0,
      unitHint: 'Yield-bearing dollar product'
    },
    {
      symbol: 'BUIDL',
      name: 'BlackRock USD Institutional Digital Liquidity Fund',
      assetClass: 'Fixed Income',
      issuer: 'BlackRock',
      compliance: 'Institutional / Permissioned',
      indicativeApy: 5.0,
      quantity: 4000,
      price: 1.0,
      unitHint: 'Tokenized short-duration US Treasury exposure'
    },
    {
      symbol: 'FIGR_HELOC',
      name: 'Figure HELOC',
      assetClass: 'Real Estate',
      issuer: 'Figure',
      compliance: 'Accredited / Permissioned',
      indicativeApy: 4.8,
      quantity: 2500,
      price: 1.02,
      unitHint: 'Home equity credit exposure'
    }
  ]
};
