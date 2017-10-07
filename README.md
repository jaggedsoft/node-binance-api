# Node Binance API
This project is to help get you started trading on Binance with the API. Advanced features are going to be added such as WebSockets, reading candlestick chart data, stop losses and iceberg orders.

#### Getting started
```javascript
const binance = require('./node-binance-api.js');
binance.options({
	'APIKEY':'<key>',
	'APISECRET':'<secret>'
});
```

#### Getting latest price of a symbol
```javascript
binance.prices(function(ticker) {
	console.log("prices()", ticker);
	console.log("Price of BNB: ", ticker.BNBBTC);
});
```

#### Getting list of current balances
```javascript
binance.balance(function(balances) {
	console.log("balances()", balances);
	console.log("ETH balance: ", balances.ETH.available);
});
```

#### Getting bid/ask prices for a symbol
```javascript
binance.bookTickers(function(ticker) {
	console.log("bookTickers()", ticker);
	console.log("Price of BNB: ", ticker.BNBBTC);
});
```

#### Get all bid/ask prices
```javascript
binance.allBookTickers(function(json) {
	console.log("allBookTickers",json);
});
```

#### Get market depth for a symbol
```javascript
binance.depth("SNMBTC", function(json) {
	console.log("market depth",json);
});
```

#### Placing a LIMIT order
```javascript
binance.buy("ETHBTC", 1, 0.0679); //symbol, quantity, price
//binance.sell("ETHBTC", 1, 0.069);
```

#### Placing a MARKET order
```javascript
binance.buy("ETHBTC", 1, 0, "MARKET") //symbol, quantity, price, type
//binance.sell(symbol, quantity, 0, "MARKET");
```

#### Cancel an order
```javascript
binance.cancel("ETHBTC", orderid, function(response) {
	console.log("cancel()",response);
});
```

#### Getting list of open orders
```javascript
binance.openOrders("ETHBTC", function(json) {
	console.log("openOrders()",json);
});
```

#### Check an order's status
```javascript
let orderid = "7610385";
binance.orderStatus("ETHBTC", orderid, function(json) {
	console.log("orderStatus()",json);
});
```

#### Cancel an order
```javascript
binance.cancel("ETHBTC", orderid, function(response) {
	console.log("cancel()",response);
});
```

#### Trade history
```javascript
binance.trades("SNMBTC", function(json) {
	console.log("trade history",json);
});
```

#### Get all account orders; active, canceled, or filled.
```javascript
binance.allOrders("ETHBTC", function(json) {
	console.log(json);
});
```

#### Get Kline/candlestick data for a symbol
```javascript
// Periods: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
binance.candlesticks("BNBBTC", "5m", function(ticks) {
	console.log("candlesticks()", ticks);
	let last_tick = ticks[ticks.length - 1];
	let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;
	console.log("BNBBTC last close: "+close);
});
```
