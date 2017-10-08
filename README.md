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
binance.allBookTickers(function(ticker) {
	console.log("allBookTickers", ticker);
});
```

#### Get market depth for a symbol
```javascript
binance.depth("SNMBTC", function(depth) {
	console.log("market depth", depth);
});
```

#### Placing a LIMIT order
```javascript
var quantity = 1, price = 0.069;
binance.buy("ETHBTC", quantity, price);
//binance.sell("ETHBTC", 1, 0.069);
```

#### Placing a MARKET order
```javascript
var quantity = 1;
binance.buy("ETHBTC", quantity, 0, "MARKET")
//binance.sell(symbol, quantity, 0, "MARKET");
```

#### Cancel an order
```javascript
binance.cancel("ETHBTC", orderid, function(response) {
	console.log("cancel()", response);
});
```

#### Getting list of open orders
```javascript
binance.openOrders("ETHBTC", function(openOrders) {
	console.log("openOrders()", openOrders);
});
```

#### Check an order's status
```javascript
let orderid = "7610385";
binance.orderStatus("ETHBTC", orderid, function(orderStatus) {
	console.log("orderStatus()", orderStatus);
});
```

#### Cancel an order
```javascript
binance.cancel("ETHBTC", orderid, function(response) {
	console.log("cancel()", response);
});
```

#### Trade history
```javascript
binance.trades("SNMBTC", function(trades) {
	console.log("trade history", trades);
});
```

#### Get all account orders; active, canceled, or filled.
```javascript
binance.allOrders("ETHBTC", function(orders) {
	console.log(orders);
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

# WebSockets Implementation

#### Get Market Depth via WebSocket
```javascript
binance.websockets.depth(['BNBBTC'], function(depth) {
	let {e:eventType, E:eventTime, s:symbol, u:updateId, b:bidDepth, a:askDepth} = depth;
	console.log(symbol+" market depth update");
	console.log(bidDepth, askDepth);
});
```

#### Get Trade Updates via WebSocket
```javascript
binance.websockets.trades(['BNBBTC', 'ETHBTC'], function(trades) {
	let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId} = trades;
	console.log(symbol+" trade update. price: "+price+", quantity: "+quantity+", maker: "+maker);
});
```

#### User Data: Account Updates, Trade Updates, New Orders, Filled Orders, Cancelled Orders via WebSocket
```javascript
binance.websockets.userData(function(data) {
	let type = data.e;
	if ( type == "outboundAccountInfo" ) {
		console.log("Balance Update");
		for ( let obj of data.B ) {
			let { a:asset, f:available, l:onOrder } = obj;
			if ( available == "0.00000000" ) continue;
			console.log(asset+"\tavailable: "+available+" ("+onOrder+" on order)");
		}
	} else if ( type == "executionReport" ) {
		let { x:executionType, s:symbol, p:price, q:quantity, S:side, o:orderType, i:orderId, X:orderStatus } = data;
		if ( executionType == "NEW" ) {
			if ( orderStatus == "REJECTED" ) {
				console.log("Order Failed! Reason: "+data.r);
			}
			console.log(symbol+" "+side+" "+orderType+" ORDER #"+orderId+" ("+orderStatus+")");
			console.log("..price: "+price+", quantity: "+quantity);
			return;
		}
		//NEW, CANCELED, REPLACED, REJECTED, TRADE, EXPIRED
		console.log(symbol+"\t"+side+" "+executionType+" "+orderType+" ORDER #"+orderId);
	} else {
		console.log("Unexpected data: "+type);
	}
});
```

#### Get Candlestick updates via WebSocket
```javascript
// Periods: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
binance.websockets.candlesticks(['BNBBTC'], "1m", function(candlesticks) {
	let { e:eventType, E:eventTime, s:symbol, k:ticks } = candlesticks;
	let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume } = ticks;
	console.log(symbol+" "+interval+" candlestick update");
	console.log("open: "+open);
	console.log("high: "+high);
	console.log("low: "+low);
	console.log("close: "+close);
	console.log("volume: "+volume);
	console.log("isFinal: "+isFinal);
});
```

