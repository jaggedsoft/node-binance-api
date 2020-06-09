![Downloads](https://img.shields.io/npm/dt/node-binance-api.svg?style=for-the-badge&maxAge=86400) ![Stars](https://img.shields.io/github/stars/jaggedsoft/node-binance-api.svg?style=for-the-badge&label=Stars) ![Contributors](https://img.shields.io/github/contributors/jaggedsoft/node-binance-api.svg?style=for-the-badge&maxAge=86400) ![Issues](https://img.shields.io/github/issues/jaggedsoft/node-binance-api.svg?style=for-the-badge&maxAge=86400) <!-- ![Issue Closure](https://img.shields.io/issuestats/i/github/jaggedsoft/node-binance-api.svg?style=for-the-badge&maxAge=86400) -->
## Advanced Examples

#### exchangeInfo(): Pull minimum order size, quantity, etc.
```js
//minQty = minimum order quantity
//minNotional = minimum order value (price * quantity)
binance.exchangeInfo(function(error, data) {
	let minimums = {};
	for ( let obj of data.symbols ) {
		let filters = {status: obj.status};
		for ( let filter of obj.filters ) {
			if ( filter.filterType == "MIN_NOTIONAL" ) {
				filters.minNotional = filter.minNotional;
			} else if ( filter.filterType == "PRICE_FILTER" ) {
				filters.minPrice = filter.minPrice;
				filters.maxPrice = filter.maxPrice;
				filters.tickSize = filter.tickSize;
			} else if ( filter.filterType == "LOT_SIZE" ) {
				filters.stepSize = filter.stepSize;
				filters.minQty = filter.minQty;
				filters.maxQty = filter.maxQty;
			}
		}
		//filters.baseAssetPrecision = obj.baseAssetPrecision;
		//filters.quoteAssetPrecision = obj.quoteAssetPrecision;
		filters.orderTypes = obj.orderTypes;
		filters.icebergAllowed = obj.icebergAllowed;
		minimums[obj.symbol] = filters;
	}
	console.log(minimums);
	global.filters = minimums;
	//fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
});
```
![image](https://user-images.githubusercontent.com/4283360/36249988-528054dc-11f1-11e8-90b8-c6002f2639f0.png)


#### Clamp order quantities to required amounts via minQty, minNotional, stepSize when placing orders
```js
// Set minimum order amount with minQty
if ( amount < minQty ) amount = minQty;

// Set minimum order amount with minNotional
if ( price * amount < minNotional ) {
	amount = minNotional / price;
}

// Round to stepSize
amount = binance.roundStep(amount, stepSize);
```
#### Show Weight Used From Last Request
> Note: Weight is not shared between Spot & Futures API
```js
const responseInfo = () => `[${ binance.statusCode() }] usedWeight:${ binance.usedWeight() } ${ binance.lastURL() }`;
await binance.time();
console.info( responseInfo() );
await binance.exchangeInfo();
console.info( responseInfo() );
await binance.futuresExchangeInfo();
console.info( responseInfo() );
console.info( `Futures ping time: ${ binance.futuresLatency() } latency` );

// Output:
// [200] usedWeight:1 url: https://api.binance.com/api/v3/time
// [200] usedWeight:2 url: https://api.binance.com/api/v3/exchangeInfo
// [200] usedWeight:1 url: https://fapi.binance.com/fapi/v1/exchangeInfo
// Futures ping time: 0ms latency

// Note: binance.getInfo() includes orderCount1s, orderCount1m, orderCount1h, orderCount1d and more.
// binance.usedWeight() defaults to X-MBX-USED-WEIGHT-1m
// binance.orderCount() defaults to X-MBX-ORDER-COUNT-1m
// binance.statusCode() usedWeight() and lastURL() are shortcuts. lastRequest is the timestamp of the last response.
```

#### Show API Rate limits
```js
binance.exchangeInfo(function(response) {
	console.log(response);
});
```
![example](http://image.ibb.co/gA2gXR/Untitled.png)

#### Connect to all WebSockets at once (Thanks keith1024!)
```js
binance.prevDay(false, (error, prevDay) => {
	let markets = [];
	for ( let obj of prevDay ) {
		let symbol = obj.symbol;
		console.log(symbol+" volume:"+obj.volume+" change: "+obj.priceChangePercent+"%");
		markets.push(symbol);
	}
	binance.websockets.candlesticks(markets, '1m', (candlestickData) => {
		let tick = binance.last(candlestickData);
		const symbol = candlestickData.s;
		const close = candlestickData[tick].c;
		console.log(symbol+": "+close);
	});
});
```


#### Enable Test Mode for orders
```js
const binance = require('node-binance-api');
binance.options({
  'APIKEY':'<key>',
  'APISECRET':'<secret>',
  'test':true
});
```

#### Get last order for a symbol
```js
binance.allOrders("BNBBTC", (error, orders, symbol) => {
  console.log(symbol+" last order:", orders);
}, {limit:1});
```


#### Terminate WebSocket connections
> First disable automatic reconnection of websockets. If you want the ability to terminate a websocket connection, you must connect to it individually. If you pass an array of symbols, a combined stream will be opened and these types of sockets cannot be terminated.

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




#### Margin User Data: Account Balance Updates, Trade Updates, New Orders, Filled Orders, Cancelled Orders via WebSocket
This is exactly the same as the ws User Data but calling:
```javascript
binance.websockets.userMarginData(margin_balance_update, margin_execution_update);
```

#### newOrderRespType example when placing orders
```js
// Returns additional information, such as filled orders
// Allows you to get the actual price paid when placing market orders
let quantity = 1;
const flags = {type: 'MARKET', newOrderRespType: 'FULL'};
binance.marketBuy("BNBBTC", quantity, flags, function(error, response) {
	if ( error ) return console.error(error);
	console.log("Market Buy response", response);
	console.log("order id: " + response.orderId);
	console.log("First price: "+response.fills[0].price);
});
```
![image](https://user-images.githubusercontent.com/4283360/36094574-acb15ae6-0fa3-11e8-9209-e6f528e09e84.png)
> First price: 0.00106140

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

#### Withdraw with custom name
```js
// let name = false // Falsy value won't save address to address book
let name = 'My Withdrawal Address'
binance.withdraw("BTC", "1C5gqLRs96Xq4V2ZZAR1347yUCpHie7sa", 0.2, undefined, name)
```

#### Withdraw with Callback
```js
binance.withdraw("ETH", "0x1d2034348c851ea29c7d03731c7968a5bcc91564", 1, false, (error, response) => {
  console.log(response);
});
```

### Proxy Support
For the standard REST API the https_proxy or socks_proxy variable is honoured
*NOTE* proxy package has no dns name support, please use proxy IP address

**Linux**
```bash
export https_proxy=http://ip:port
#export socks_proxy=socks://ip:port
# run your app
```

**Windows**
```bash
set https_proxy=http://ip:port
#set socks_proxy=socks://ip:port
# run your app
```

For web sockets currently only the socks method is functional at this time

**linux**
```bash
export socks_proxy=socks://ip:port
# run your app
```

**windows**
```bash
set socks_proxy=socks://ip:port
# run your app
```

#### Asynchronous Syntax Options
> The examples below show three most common syntaxes for asynchronous API calls and their respective methods of error handling. If you do not pass a callback function as an argument, the API call returns a promise instead.

```js
const callback = binance.prices("NEOBTC", (error, response) => {
  if (error) {
    console.error(error)
  } else {
    console.log(response)
  }
})

const classicPromise = binance.prices("NEOBTC")
  .then(response => console.log(response))
  .catch(error => console.error(error))

const asyncAwait = (async _ => {
  try {
    const response = await binance.prices("NEOBTC")
    console.log(response)
  } catch (error) {
    console.error(error)
  }
})()
```
