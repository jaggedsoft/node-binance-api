const Binance = require( 'node-binance-api' );
const binance = new Binance();
global.ticker = {};

// Show contents of BNBUSDT ticker object once per second
setInterval( () => {
    if ( !global.ticker.BNBUSDT ) return;
    console.log( global.ticker.BNBUSDT );
    console.log( `BNB ask: ${global.ticker.BNBUSDT.bestAsk} bid: ${global.ticker.BNBUSDT.bestBid}` );
}, 1000 );

// Get 24h price change statistics for all symbols
binance.websockets.prevDay( false, function ( error, obj ) {
    global.ticker[obj.symbol] = obj;
} );
