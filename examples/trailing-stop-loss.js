const Binance = require('node-binance-api');
const binance = new Binance().options('options.json');

const quantity = 1;
const price = 2000;
const trailingDelta = 500;

await binance.sell("ETHUSDT", quantity, price, { 
    timeInForce: 'GTC', 
    trailingDelta: trailingDelta, 
    type: 'STOP_LOSS_LIMIT'
})