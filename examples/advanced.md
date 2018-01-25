## Advanced Examples

#### exchangeInfo(): Pull minimum order size, quantity, etc.
```js
//minQty = minimum order quantity
//minNotional = minimum order value (price * quantity)
binance.exchangeInfo(function(error, data) {
	let minimums = {};
	for ( let obj of data.symbols ) {
		let filters = {minNotional:0.001,minQty:1,maxQty:10000000,stepSize:1,minPrice:0.00000001,maxPrice:100000};
		for ( let filter of obj.filters ) {
			if ( filter.filterType == "MIN_NOTIONAL" ) {
				filters.minNotional = filter.minNotional;
			} else if ( filter.filterType == "PRICE_FILTER" ) {
				filters.minPrice = filter.minPrice;
				filters.maxPrice = filter.maxPrice;
			} else if ( filter.filterType == "LOT_SIZE" ) {
				filters.minQty = filter.minQty;
				filters.maxQty = filter.maxQty;
				filters.stepSize = filter.stepSize;
			}
		}
		minimums[obj.symbol] = filters;
	}
	console.log(minimums);
	fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
});
```
![example](https://image.ibb.co/bz5KAG/notationals.png)

#### Show API Rate limits
```js
binance.exchangeInfo(function(response) {
	console.log(response);
});
```
![example](http://image.ibb.co/gA2gXR/Untitled.png)



#### Enable Test Mode for orders
```js
const binance = require('node-binance-api');
binance.options({
  'APIKEY':'<key>',
  'APISECRET':'<secret>',
  'test':true
});
```


#### Terminate WebSocket connections
First disable automatic reconnection of websockets

```js
binance.options({
	'APIKEY': '<your key>',
	'APISECRET': '<your secret>',
	'reconnect': false
});
```

Now you can terminate each websocket endpoint by the id:
```js
binance.websockets.terminate('ethbtc@ticker'); // for prevday
binance.websockets.terminate('ethbtc@kline_1m'); // for candlestick charts
```

You can store a reference to each `ws` object or view a list of all of them:
```js
// List all endpoints
let endpoints = binance.websockets.subscriptions();
for ( let endpoint in endpoints ) {
	console.log(endpoint);
	//binance.websockets.terminate(endpoint);
}
```


#### User Data: Account Balance Updates, Trade Updates, New Orders, Filled Orders, Cancelled Orders via WebSocket
```javascript
// The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled
function balance_update(data) {
	console.log("Balance Update");
	for ( let obj of data.B ) {
		let { a:asset, f:available, l:onOrder } = obj;
		if ( available == "0.00000000" ) continue;
		console.log(asset+"\tavailable: "+available+" ("+onOrder+" on order)");
	}
}
function execution_update(data) {
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
}
binance.websockets.userData(balance_update, execution_update);
```
<details>
 <summary>View Response</summary>

```
BNBBTC  NEW BUY LIMIT ORDER #6407865 (NEW)
..price: 0.00035595, quantity: 5.00000000
Balance Update
BTC     available: 0.77206464 (0.00177975 on order)
ETH     available: 1.14109900 (0.00000000 on order)
BNB     available: 41.33761879 (0.00000000 on order)
SNM     available: 0.76352833 (0.00000000 on order)
```
</details>
  
#### Recent Trades (historicalTrades, recentTrades, aggTrades functions)

```js
binance.aggTrades("BNBBTC", {limit:500}, (error, response)=>{
	console.log("aggTrades", response);
});
```

```js
binance.recentTrades("BNBBTC", (error, response)=>{
	console.log("recentTrades", response);
});
```

```js
binance.historicalTrades("BNBBTC", (error, response)=>{
	console.log("historicalTrades", response);
});
```
