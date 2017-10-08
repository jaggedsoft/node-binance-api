/* ============================================================
 * node-binance-api
 * https://github.com/jaggedsoft/node-binance-api
 * ============================================================ */

module.exports = function() {
	'use strict';
	const WebSocket = require('ws');
	const request = require('request');
	const crypto = require('crypto');
	const base = 'https://www.binance.com/api/';
	const websocket_base = 'wss://stream.binance.com:9443/ws/';
	let options = {};
	
	const publicRequest = function(url, data, callback, method = "GET") {
		if ( !data ) data = {};
		let opt = {
			url: url,
			qs: data,
			method: method,
			agent: false,
			headers: {
				'User-Agent': 'Mozilla/4.0 (compatible; Node Binance API)',
				'Content-type': 'application/x-www-form-urlencoded'
			}
		};
		request(opt, function(error, response, body) {
			if ( !response || !body ) throw "publicRequest error: "+error;
			if ( callback ) callback(JSON.parse(body));
		});
	};
	
	const apiRequest = function(url, callback, method = "GET") {
		let opt = {
			url: url,
			method: method,
			agent: false,
			headers: {
				'User-Agent': 'Mozilla/4.0 (compatible; Node Binance API)',
				'Content-type': 'application/x-www-form-urlencoded',
				'X-MBX-APIKEY': options.APIKEY
			}
		};
		request(opt, function(error, response, body) {
			if ( !response || !body ) throw "apiRequest error: "+error;
			if ( callback ) callback(JSON.parse(body));
		});
	};
		
	const signedRequest = function(url, data, callback, method = "GET") {
		if ( !data ) data = {};
		data.timestamp = new Date().getTime();
		if ( typeof data.symbol !== "undefined" ) data.symbol = data.symbol.replace('_','');
		if ( typeof data.recvWindow == "undefined" ) data.recvWindow = 6500;
		let query = Object.keys(data).reduce(function(a,k){a.push(k+'='+encodeURIComponent(data[k]));return a},[]).join('&');
		let signature = crypto.createHmac("sha256", options.APISECRET).update(query).digest("hex"); // set the HMAC hash header
		let opt = {
			url: url+'?'+query+'&signature='+signature,
			method: method,
			agent: false,
			headers: {
				'User-Agent': 'Mozilla/4.0 (compatible; Node Binance API)',
				'Content-type': 'application/x-www-form-urlencoded',
				'X-MBX-APIKEY': options.APIKEY
			}
		};
		request(opt, function(error, response, body) {
			if ( !response || !body ) throw "signedRequest error: "+error;
			if ( callback ) callback(JSON.parse(body));
		});
	};
	
	const order = function(side, symbol, quantity, price, type = "LIMIT") {
		let opt = {
			symbol: symbol,
			side: side,
			type: type,
			price: price,
			quantity: quantity,
			timeInForce: "GTC",
			recvWindow: 60000
		};
		signedRequest(base+"v3/order", opt, function(response) {
			console.log(side+"("+symbol+","+quantity+","+price+") ",response);
		}, "POST");
	};
	////////////////////////////
	const subscribe = function(endpoint, callback) {
		const ws = new WebSocket(websocket_base+endpoint);
	    ws.on('open', function() {
			//console.log("subscribe("+endpoint+")");
		});
		
		ws.on('message', function(data) {
			//console.log(data);
            callback(JSON.parse(data));
		});
	};
	////////////////////////////
	const priceData = function(data) {
		let prices = {};
		for ( let obj of data ) {
			prices[obj.symbol] = obj.price;
		}
		return prices;
	};
	const bookPriceData = function(data) {
		let prices = {};
		for ( let obj of data ) {
			prices[obj.symbol] = {
				bid:obj.bidPrice,
				bids:obj.bidQty,
				ask:obj.askPrice,
				asks:obj.askQty
			};
		}
		return prices;
	};
	const balanceData = function(data) {
		let balances = {};
		for ( let obj of data.balances ) {
			balances[obj.asset] = {available:obj.free, onOrder:obj.locked};
		}
		return balances;
	};
	////////////////////////////
	return {
		options: function(opt) {
			options = opt;
		},
		buy: function(symbol, quantity, price, type = "LIMIT") {
			order("BUY", symbol, quantity, price, type);
		},
		sell: function(symbol, quantity, price, type = "LIMIT") {
			order("SELL", symbol, quantity, price, type);
		},
		cancel: function(symbol, orderid, callback) {
			signedRequest(base+"v3/order", {symbol:symbol, orderId:orderid}, callback, "DELETE");
		},
		orderStatus: function(symbol, orderid, callback) {
			signedRequest(base+"v3/order", {symbol:symbol, orderId:orderid}, callback);
		},
		openOrders: function(symbol, callback) {
			signedRequest(base+"v3/openOrders", {symbol:symbol}, callback);
		},
		allOrders: function(symbol, callback) {
			signedRequest(base+"v3/allOrders", {symbol:symbol, limit:500}, callback);
		},
		depth: function(symbol, callback) {
			publicRequest(base+"v1/depth", {symbol:symbol}, callback);
		},
		prices: function(callback) {
			request(base+"v1/ticker/allPrices", function(error, response, body) {
				if ( !response || !body ) throw "allPrices error: "+error;
				if ( callback ) callback(priceData(JSON.parse(body)));
			});
		},
		bookTickers: function(callback) {
			request(base+"v1/ticker/allBookTickers", function(error, response, body) {
				if ( !response || !body ) throw "allBookTickers error: "+error;
				if ( callback ) callback(bookPriceData(JSON.parse(body)));
			});
		},
		account: function(callback) {
			signedRequest(base+"v3/account", {}, callback);
		},
		balance: function(callback) {
			signedRequest(base+"v3/account", {}, function(data) {
				if ( callback ) callback(balanceData(data));
			});
		},
		trades: function(symbol,callback) {
			signedRequest(base+"v3/myTrades", {symbol:symbol}, callback);
		},
		candlesticks: function(symbol, interval = "5m", callback) { //1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
			publicRequest(base+"v1/klines", {symbol:symbol, interval:interval}, callback);
		},
		publicRequest: function(url, data, callback, method = "GET") {
			publicRequest(url, data, callback, method)
		},
		signedRequest: function(url, data, callback, method = "GET") {
			signedRequest(url, data, callback, method);
		},
		websockets: {
			userData: function(callback) {
				apiRequest(base+"v1/userDataStream", function(response) {
					options.listenKey = response.listenKey;
					setInterval(function() { // keepalive
						apiRequest(base+"v1/userDataStream", false, "PUT");
					},30000);
					subscribe(options.listenKey, callback);
				},"POST");
			},
			subscribe: function(url, callback) {
				
			},
			depth: function(symbols, callback) {
				for ( let symbol of symbols ) {
					subscribe(symbol.toLowerCase()+"@depth", callback);
				}
			},
			trades: function(symbols, callback) {
				for ( let symbol of symbols ) {
					subscribe(symbol.toLowerCase()+"@aggTrade", callback);
				}
			},
			candlesticks: function(symbols, interval, callback) {
				for ( let symbol of symbols ) {
					subscribe(symbol.toLowerCase()+"@kline_"+interval, callback);
				}
			}
		}
	};
}();
