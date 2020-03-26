( async () => {
  const Binance = require('node-binance-api');
  const binance = new Binance({
    APIKEY: '<key>',
    APISECRET: '<secret>'
  });
  
  // OCO Order
  binance.order('SELL', 'BNBBTC', 1, 0.0029, { type:'OCO' , stopLimitPrice: 0.001, stopPrice: 0.001 }, (error, response) => {})

  // Alternative Syntax
  binance.sell('BNBBTC', 1, 0.0029, { type:'OCO' , stopLimitPrice: 0.001, stopPrice: 0.001 }, (error, response) => {})
  
} )();
