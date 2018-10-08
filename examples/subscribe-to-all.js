const Binance = require('node-binance-api');
const binance = new Binance().options('options.json');
global.ticker = {};

// Get all symbols
binance.prevDay(false, (error, prevDay) => {
    if ( error ) return console.log(error.body);
    let markets = [];
    for ( let obj of prevDay ) {
        let symbol = obj.symbol;

        // Filter BTC & USDT markets only (example)
        if ( !symbol.endsWith('BTC') && !symbol.endsWith('USDT') ) continue;

        console.log(`${symbol} price: ${obj.lastPrice} volume: ${obj.volume} change: ${obj.priceChangePercent}%`);
        global.ticker[symbol] = obj.lastPrice;
        markets.push(symbol);
    }

    // Subscribe to trades endpoint for all markets
    binance.websockets.trades(markets, (trades) => {
        let { e: eventType, E: eventTime, s: symbol, p: price, q: quantity, m: maker, a: tradeId } = trades;
        console.log(`${symbol} price: ${price}`);
        global.ticker[symbol] = price;
    });

    // You can use global.ticker anywhere in your program now
    setInterval(() => {
        console.log("*** Price of BTC: " + global.ticker.BTCUSDT);
    }, 3000);
});
