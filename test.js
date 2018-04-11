/* ============================================================
 * node-binance-api
 * https://github.com/jaggedsoft/node-binance-api
 * ============================================================
 * Copyright 2017-, Jon Eyrick
 * Released under the MIT License
 * ============================================================ */

'use strict';

let chai = require( 'chai' );
let assert = chai.assert;

let path = require( 'path' );
//var assert = require( "assert" ).strict;
let binance = require( path.resolve( __dirname, 'node-binance-api.js' ) );
let util = require( 'util' );

let num_pairs = 299;
let num_currencies = 156;
let logger = {
  log: function (msg){
    let logLineDetails = ((new Error().stack).split('at ')[3]).trim();
    let logLineNum = logLineDetails.split(':');
    console.log('DEBUG', logLineNum[1] + ':' + logLineNum[2], msg);
  }
}
let debug = function( x ) {
  if ( typeof ( process.env.node_binance_api ) === 'undefined' ) {
    return;
  }
  logger.log( typeof ( x ) );
  logger.log( util.inspect( x ) );
}
let stopSockets = function() {
  let endpoints = binance.websockets.subscriptions();
  for ( let endpoint in endpoints ) {
    console.log(endpoint);
    binance.websockets.terminate(endpoint);
  }
}
describe( 'Construct', function() {
  it( 'Construct the binance object', function() {
    binance.options( {
      APIKEY: 'z5RQZ9n8JcS3HLDQmPpfLQIGGQN6TTs5pCP5CTnn4nYk2ImFcew49v4ZrmP3MGl5',
      APISECRET: 'ZqePF1DcLb6Oa0CfcLWH0Tva59y8qBBIqu789JEY27jq0RkOKXpNl9992By1PN9Z',
      useServerTime: true,
      reconnect: false,
      verbose: true
    } );
    debug( binance );
    assert( typeof ( binance ) === 'object', 'Binance is not an object' );
  } );
} );

/*global describe*/
/*eslint no-undef: "error"*/
describe( 'Depth cache', function() {
  /*global it*/
  /*eslint no-undef: "error"*/
  it( 'Attempt to get depthcache of a symbol', function() {

    binance.websockets.depthCache(['BNBBTC'], (symbol, depth) => {
      debug( depth );
      stopSockets();
    });

    debug( 'todo' );

    /*
    var dc_true = binance.depthCache( "BNBBTC" );
    var dc_false = binance.depthCache( "ABCDEF" );

    debug( dc_true );

    // true cases
    assert( typeof( dc_true ) == "object" , "Should be an object" );
    assert.notDeepEqual( dc_true , {bids: {}, asks: {}}, "should not be blank object with asks and bids keys only" );
    assert( object.Keys( dc_true ).length == 2 );
    assert( dc_true.hasOwnProperty( "asks" ), "missing asks property" );
    assert( dc_true.hasOwnProperty( "bids" ), "missing bids property" );
    assert( Object.keys( dc_true.asks ).length != 0, "should not be 0" );
    assert( Object.keys( dc_true.bids ).length != 0, "should not be 0" );

    // false cases
    assert( typeof( dc_false ) == "object" , "Should be an object" );
    assert.deepEqual( dc_false, {bids: {}, asks: {}}, "should be blank object with asks and bids keys" );
    assert( object.Keys( dc_false ).length == 2 );
    assert( dc_false.hasOwnProperty( "asks" ), "missing asks property" );
    assert( dc_false.hasOwnProperty( "bids" ), "missing bids property" );
    assert( Object.keys( dc_false.asks ).length = 0, "should be 0" );
    assert( Object.keys( dc_false.bids ).length = 0, "should be 0" );
    */

  });
});

describe( 'Prices', function() {
  it( 'Checks the price of BNBBTC', function() {
    binance.prices( 'BNBBTC', ( error, ticker ) => {
      debug( error );
      debug( ticker );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( ticker ) === 'object' );
      assert( error === null );
      assert( ticker !== null );
      assert( Object.prototype.hasOwnProperty.call(ticker, 'BNBBTC' ) );
      assert( Object.prototype.hasOwnProperty.call(ticker, 'ETHBTC' ) === false );
    } );
  } );
} );

describe( 'All Prices', function() {
  it( 'Checks the prices of coin pairs', function() {
    binance.prices( ( error, ticker ) => {
      debug( error );
      debug( ticker );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( ticker ) === 'object' );
      assert( error === null );
      assert( ticker !== null );
      assert( Object.prototype.hasOwnProperty.call(ticker, 'BNBBTC' ) );
      assert( Object.keys( ticker ).length >= num_pairs );
    } );
  } );
} );

describe( 'Balances', function() {
  it( 'Get the balances in the account', function() {
    binance.balance( ( error, balances ) => {
      debug( error );
      debug( balances );
      assert( error === null );
      assert( balances !== null );
      assert( balances );
      assert( Object.prototype.hasOwnProperty.call(balances, 'BNB' ) );
      assert( Object.prototype.hasOwnProperty.call(balances.BNB, 'available' ) );
      assert( Object.prototype.hasOwnProperty.call(balances.BNB, 'onOrder' ) );
      assert( Object.keys( balances ).length >= num_currencies );
    } );
  } );
} );

describe( 'Book Ticker', function() {
  it( 'Get the BNB book ticker', function() {
    binance.bookTickers( 'BNBBTC', ( error, ticker ) => {
      debug( error );
      debug( ticker );
      assert( error === null );
      assert( ticker !== null );
      assert( ticker );

      let members = ['symbol', 'bidPrice', 'bidQty', 'askPrice', 'askQty'];
      members.forEach( function( value ) {
        assert( Object.prototype.hasOwnProperty.call(ticker, value ) );
      } );
    } );
  } );
} );

describe( 'Booker Tickers', function() {
  it( 'Get the tickers for all pairs', function() {
    binance.bookTickers( ( error, ticker ) => {
      debug( error );
      debug( ticker );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( ticker ) === 'object' );
      assert( error === null );
      assert( ticker !== null );
      assert( Object.keys( ticker ).length >= num_pairs );

      let members = ['symbol', 'bidPrice', 'bidQty', 'askPrice', 'askQty'];
      ticker.forEach( function( obj) {
        members.forEach( function( member ) {
          assert( Object.prototype.hasOwnProperty.call(obj, member ) );
        } );
      } );
    } );
  } );
} );

describe( 'Market', function() {
  it( 'Get the market base symbol of a symbol pair', function() {
    let tocheck = ['TRXBNB', 'BNBBTC', 'BNBETH', 'BNBUSDT'];
    tocheck.forEach( function(element) {
      let mark = binance.getMarket(element);
      assert( typeof ( mark ) === 'string' );
      assert( element.endsWith( mark ), 'should end with: ' + mark );
    });

    assert.isNotOk( binance.getMarket('ABCDEFG' ), 'should be undefined' );
  } );
} );

describe( 'Depth chart BNB', function() {
  it( 'Get the depth chart information for BNBBTC', function() {
    binance.depth( 'BNBBTC', ( error, depth, symbol ) => {
      debug( error );
      debug( depth );
      debug( symbol );
      assert( error === null );
      assert( depth !== null );
      assert( symbol !== null );
      assert( typeof ( symbol ) === 'string' );
      assert( symbol === 'BNBBTC' );
      assert( typeof ( depth ) === 'object' );
      assert( Object.keys( depth ).length === 3 );

      let members = ['lastUpdateId', 'asks', 'bids'];
      members.forEach( function( value ) {
        assert( Object.prototype.hasOwnProperty.call(depth, value ) );
      } );
    } );
  } );
} );

describe( 'Buy', function() {
  it( 'Attempt to buy ETH', function() {
    let quantity = 1;
    let price = 0.069;
    assert( typeof ( binance.buy( 'ETHBTC', quantity, price ) ) === 'undefined' );
  } );
} );

describe( 'Sell', function() {
  it( 'Attempt to sell ETH', function() {
    let quantity = 1;
    let price = 0.069;
    assert( typeof ( binance.sell( 'ETHBTC', quantity, price ) ) === 'undefined' );
  } );
} );

describe( 'MarketiBuy', function() {
  it( 'Attempt to buy ETH at market price', function() {
    let quantity = 1;
    assert( typeof ( binance.marketBuy( 'BNBBTC', quantity ) ) === 'undefined' );
  } );
} );

describe( 'MarketSell', function() {
  it( 'Attempt to sell ETH at market price', function() {
    let quantity = 1;
    assert( typeof ( binance.marketSell( 'ETHBTC', quantity ) ) === 'undefined' );
  } );
} );

describe( 'Buy order advanced', function() {
  it( 'Attempt to buy BNB specifying order type', function() {
    let quantity = 1;
    let price = 0.069;
    binance.buy( 'BNBETH', quantity, price, { type: 'LIMIT' }, ( error, response ) => {
      debug( error );
      debug( response );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( response ) === 'object' );
      assert( error !== null );
      assert( response !== null );
      assert( error.body === '{"code":-2010,"msg":"Account has insufficient balance for requested action."}' );
      assert( typeof ( response.orderId ) === 'undefined' );
      assert( Object.keys( response ).length === 0 );
    } );
  } );
} );

describe( 'Sell Stop loess', function() {
  it( 'Attempt to create a stop loss order', function() {
    let type = 'STOP_LOSS';
    let quantity = 1;
    let price = 0.069;
    let stopPrice = 0.068;
    assert( typeof ( binance.sell( 'ETHBTC', quantity, price, { stopPrice: stopPrice, type: type } ) ) === 'undefined' );
  } );
} );

describe( 'Iceberg sell order', function() {
  it( 'Attempt to create a sell order', function() {
    let quantity = 1;
    let price = 0.069;
    assert( typeof ( binance.sell( 'ETHBTC', quantity, price, { icebergQty: 10 } ) ) === 'undefined' );
  } );
} );

describe( 'Cancel order', function() {
  it( 'Attempt to cancel an order', function() {
    let orderid = '7610385';
    binance.cancel( 'ETHBTC', orderid, ( error, response, symbol ) => {
      debug( error );
      debug( response );
      debug( symbol );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( response ) === 'object' );
      assert( typeof ( symbol ) === 'string' );
      assert( symbol === 'ETHBTC' );
      assert( error !== null );
      assert( response !== null );
      assert( error.body === '{"code":-2011,"msg":"UNKNOWN_ORDER"}' );
      assert( typeof ( response.orderId ) === 'undefined' );
      assert( Object.keys( response ).length === 0 );
    } );
  } );
} );

describe( 'Cancel orders', function() {
  it( 'Attempt to cancel all orders given a symbol', function() {
    binance.cancelOrders( 'XMRBTC', ( error, response, symbol ) => {
      debug( error );
      debug( response );
      debug( symbol );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( response ) === 'object' );
      assert( typeof ( symbol ) === 'string' );
      assert( symbol === 'XMRBTC' );
      assert( error === null );
      assert( response !== 'XMRBTC' );
      assert( error.body === '{"code":-2011,"msg":"UNKNOWN_ORDER"}' );
      assert( typeof ( response.orderId ) === 'undefined' );
      assert( Object.keys( response ).length === 0 );
    } );
  } );
} );

describe( 'Open Orders', function() {
  it( 'Attempt to show all orders to ETHBTC', function() {
    binance.openOrders( 'ETHBTC', ( error, openOrders, symbol ) => {
      debug( error );
      debug( openOrders );
      debug( symbol );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( openOrders ) === 'object' );
      assert( typeof ( symbol ) === 'string' );
      assert( symbol === 'ETHBTC' );
      assert( error === null );
      assert( openOrders !== null );
      assert( symbol !== null );
      assert( Object.keys( openOrders ).length === 0 );
    } );
  } );
} );

describe( 'Open Orders', function() {
  it( 'Attempt to show all orders for all symbols', function() {
    binance.openOrders( false, ( error, openOrders ) => {
      debug( error );
      debug( openOrders );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( openOrders ) === 'object' );
      assert( error === null );
      assert( openOrders !== null );
      assert( Object.keys( openOrders ).length === 0 );
    } );
  } );
} );

describe( 'Order status', function() {
  it( 'Attempt to get the order status for a given order id', function() {
    binance.orderStatus( 'ETHBTC', '1234567890', ( error, orderStatus, symbol ) => {
      debug( error );
      debug( orderStatus );
      debug( symbol );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( orderStatus ) === 'object' );
      assert( typeof ( symbol ) === 'string' );
      assert( symbol === 'ETHBTC' );
      assert( error !== null );
      assert( orderStatus !== null );
      assert( error.body === '{"code":-2013,"msg":"Order does not exist."}' );
      assert( Object.keys( orderStatus ).length === 0 );
    } );
  } );
} );

describe( 'trades', function() {
  it( 'Attempt get all trade history for given symbol', function() {
    binance.trades( 'SNMBTC', ( error, trades, symbol ) => {
      debug( error );
      debug( trades );
      debug( symbol );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( trades ) === 'object' );
      assert( typeof ( symbol ) === 'string' );
      assert( symbol === 'SNMBTC' );
      assert( error === null );
      assert( trades !== null );
      assert( Object.keys( trades ).length === 0 );
    } );
  } );
} );

describe( 'Orders', function() {
  it( 'Attempt get all orders for given symbol', function() {
    binance.allOrders( 'ETHBTC', ( error, orders, symbol ) => {
      debug( error );
      debug( orders );
      debug( symbol );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( orders ) === 'object' );
      assert( typeof ( symbol ) === 'string' );
      assert( symbol === 'ETHBTC' );
      assert( error === null );
      assert( orders !== null );
      assert( Object.keys( orders ).length === 0 );
    } );
  } );
} );

describe( 'Prevday all symbols', function() {
  it( 'Attempt get prevday trade status for all symbols', function() {

    binance.prevDay( false, ( error, prevDay ) => {
      debug( error );
      debug( prevDay );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( prevDay ) === 'object' );
      assert( error === null );
      assert( prevDay !== null );
      assert( Object.keys( prevDay ).length >= num_pairs );

      let members = [
        'symbol', 'priceChange', 'priceChangePercent', 'weightedAvgPrice', 'prevClosePrice',
        'lastPrice', 'lastQty', 'bidPrice', 'bidQty', 'askQty', 'openPrice', 'highPrice', 'lowPrice',
        'volume', 'quoteVolume', 'openTime', 'closeTime', 'firstId', 'lastId', 'count'
      ];
      prevDay.forEach( function( obj ) {
        members.forEach( function( key ) {
          assert( Object.prototype.hasOwnProperty.call( obj, key ) );
        } );
      } );
    } );
  } );
} );

describe( 'Prevday', function() {
  it( 'Attempt get prevday trade status for given symbol', function() {
    binance.prevDay( 'BNBBTC', ( error, prevDay, symbol ) => {
      debug( error );
      debug( prevDay );
      debug( symbol );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( prevDay ) === 'object' );
      assert( typeof ( symbol ) === 'string' );
      assert( symbol === 'BNBBTC' );
      assert( error === null );
      assert( prevDay !== null );

      let members = [
        'symbol', 'priceChange', 'priceChangePercent', 'weightedAvgPrice', 'prevClosePrice',
        'lastPrice', 'lastQty', 'bidPrice', 'bidQty', 'askQty', 'openPrice', 'highPrice', 'lowPrice',
        'volume', 'quoteVolume', 'openTime', 'closeTime', 'firstId', 'lastId', 'count'
      ];
      members.forEach( function( key ) {
        assert( Object.prototype.hasOwnProperty.call( prevDay, key ) );
      } );
    } );
  } );
} );

describe( 'Candle sticks', function() {
  it( 'Attempt get candlesticks for a given symbol', function() {
    binance.candlesticks( 'BNBBTC', '5m', ( error, ticks, symbol ) => {
      debug( error );
      debug( ticks );
      debug( symbol );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( ticks ) === 'object' );
      assert( typeof ( symbol ) === 'string' );
      assert( symbol === 'BNBBTC' );
      assert( error === null );
      assert( ticks !== null );

      ticks.forEach( function( tick ) {
        assert( tick.length === 12 );
      } );
    }, {
      limit: 500,
      endTime: 1514764800000
    } );
  } );
} );

describe( 'Object keys', function() {
  describe( 'First', function() {
    it( 'Gets the first key', function() {
      let first = binance.first( { first: '1', second: '2', third: '3' } );assert.strictEqual( 'first', first, 'should be first' );
    });
  });

  describe( 'Last', function() {
    it( 'Gets the last key', function() {
      let last = binance.last( { first: '1', second: '2', third: '3' } );assert.strictEqual( 'third', last, 'should be third' );
    });
  });

  describe( 'slice', function() {
    it( 'Gets slice of the object keys', function() {
      let slice = binance.slice( { first: '1', second: '2', third: '3' }, 2 );
      assert.deepEqual( ['third'], slice, 'should be ian array with the third' );
    });
  });

  describe( 'Min', function() {
    it( 'Gets the math min of object', function() {
      debug( 'todo' );
    });
  });

  describe( 'Max', function() {
    it( 'Gets the math max of object', function() {
      debug( 'todo' );
    });
  });
});

describe( 'Set/Get options', function() {
  it( 'Sets/Gets option to specified value', function() {
    binance.setOption( 'test', 'value' );
    assert.equal( binance.getOption( 'test' ), 'value', 'should be value' );
  });
});

describe( 'Get options', function() {
  it( 'Gets all options', function() {
    assert( typeof ( binance.getOptions() ) === 'object' , 'should be object' );
  });
});

describe( 'Percent', function() {
  it( 'Get Percentage of two values', function() {
    assert( binance.percent( 25, 100 ) === 25 , 'should be 25 percent' );
  });
});

describe( 'Sum', function() {
  it( 'Get sum of array of values', function() {
    assert( binance.sum( [1, 2, 3] ) === 6 , 'should be 6' );
  });
});

describe( 'Reverse', function() {
  it( 'Reverse the keys in an object', function() {
    assert( binance.reverse( { '3': 3, '2': 2, '1': 1 } ).toString() === {'1': 1, '2': 2, '3': 3 }.toString(), 'should be {\'1\': 1, \'2\': 2, \'3\': 3 }' );
  });
});

describe( 'Array', function() {
  it( 'Convert object to an array', function() {
    let actual = binance.array( { 'a': 1, 'b': 2,'c': 3 } );
    let expected = [[NaN, 1], [NaN, 2], [NaN, 3]];
    assert.isArray( actual, 'should be an array' );
    assert( actual.length === 3, 'should be of lenght 3' );
    assert.deepEqual( actual, expected, 'should be both arrays with same vlaues' )
  });
});

describe( 'sortBids', function() {
  it( 'Sorts symbols bids and reurns an object', function() {
    /* let actual = binance.sortBids( 'BNBBTC' );
       debug( actual ); */
    debug( 'todo' );
  });
});

describe( 'sortAsks', function() {
  it( 'Sorts symbols asks and reurns an object', function() {
    /* let actual = binance.sortBids( 'BNBBTC' );
       debug( actual ); */
    debug( 'todo' );
  });
});

describe( 'Exchange Info', function() {
  let async_error;
  let async_data;
  /*global beforeEach*/
  /*eslint no-undef: "error"*/
  beforeEach(function (done) {
    binance.exchangeInfo(function(error, data) {
      async_error = error;
      async_data = data;
      done( error );
    })
  });

  it( 'Gets the exchange info as an object', function() {
    assert( typeof ( async_error ) === 'object', 'error should be object' );
    assert( async_error === null, 'Error should be null' );

    assert( typeof ( async_data ) === 'object', 'data should be object' );
    assert( async_data !== null, 'data should not be null' );
    assert( Object.prototype.hasOwnProperty.call( async_data, 'symbols' ), 'data should have property \'symbols\'' );

    let symbolMembers = ['status', 'orderTypes', 'icebergAllowed', 'baseAsset', 'baseAssetPrecision', 'quoteAsset', 'quotePrecision'];
    async_data.symbols.forEach( function( symbol ) {
      symbolMembers.forEach( function( member ) {
        assert( Object.prototype.hasOwnProperty.call( symbol, member ), 'missing property from symbol \'' + member + '\'' );
      });
    });
  });
});

describe( 'System status', function() {
  let async_error;
  let async_data;
  /*global beforeEach*/
  /*eslint no-undef: "error"*/
  beforeEach(function (done) {
    binance.systemStatus(function(error, data) {
      async_error = error;
      async_data = data;
      done( error );
    })
  });

  it( 'Gets the system status info as an object', function() {

    /* debug( async_error );
       debug( async_data ); */
    assert( typeof ( async_error ) === 'object', 'error should be object' );
    assert( async_error === null, 'Error should be null' );

    assert( typeof ( async_data ) === 'object', 'data should be object' );
    assert( async_data !== null, 'data should not be null' );
    assert( Object.prototype.hasOwnProperty.call( async_data, 'msg' ), 'data should have property \'msg\'' );
    assert( Object.prototype.hasOwnProperty.call( async_data, 'status' ), 'data should have property \'status\'' );

    let members = ['msg', 'status'];
    members.forEach( function( member ) {
      assert( Object.prototype.hasOwnProperty.call( async_data, member ), 'missing property from symbol \'' + member + '\'' );
    });
  });
});

describe( 'Withdraw', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Withdraw history', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Deposit history', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Deposit address', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Account status', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Account', function() {
  it( 'Attempt to get account information', function() {
    binance.account( ( error, data ) => {
      debug( error );
      debug( data );
      assert( typeof ( error ) === 'object' );
      assert( typeof ( data ) === 'object' );
      assert( error === null );
      assert( data !== null );
    } );
  } );
});

describe( 'Use Server Time', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Time', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Aggtrades', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Recent Trades', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Historical Trades', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Highstock', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});

describe( 'Ohlc', function() {
  it( 'Todo', function() {
    debug( 'todo' );
  });
});
