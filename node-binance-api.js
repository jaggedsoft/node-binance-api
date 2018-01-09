/* ============================================================
 * node-binance-api
 * https://github.com/jaggedsoft/node-binance-api
 * ============================================================
 * Copyright 2017-, Jon Eyrick
 * Released under the MIT License
 * ============================================================ */

module.exports = function() {
	'use strict';
	const WebSocket = require('ws');
	const request = require('request');
	const crypto = require('crypto');
	const base = 'https://api.binance.com/api/';
	const wapi = 'https://api.binance.com/wapi/';
	const websocket_base = 'wss://stream.binance.com:9443/ws/';
	const userAgent = 'Mozilla/4.0 (compatible; Node Binance API)';
	const contentType = 'application/x-www-form-urlencoded';
	let subscriptions = {};
	let messageQueue = {};
	let depthCache = {};
	let ohlcLatest = {};
	let klineQueue = {};
	let info = {};
	let ohlc = {};
	let options = {recvWindow:60000, reconnect:true, test: false};

	const publicRequest = function(url, data, callback, method = 'GET') {
		if ( !data ) data = {};
		let opt = {
			url: url,
			qs: data,
			method: method,
			timeout: options.recvWindow,
			agent: false,
			headers: {
				'User-Agent': userAgent,
				'Content-type': contentType
			}
		};
		request(opt, function(error, response, body) {
			if ( error ) throw error;
			if ( response && response.statusCode !== 200 ) throw response;
			if ( callback ) callback(JSON.parse(body));
		});
	};

	const apiRequest = function(url, callback, method = 'GET') {
		if ( !options.APIKEY ) throw 'apiRequest: Invalid API Key';
		let opt = {
			url: url,
			method: method,
			timeout: options.recvWindow,
			agent: false,
			headers: {
				'User-Agent': userAgent,
				'Content-type': contentType,
				'X-MBX-APIKEY': options.APIKEY
			}
		};
		request(opt, function(error, response, body) {
			if ( error ) throw error;
			if ( response && response.statusCode !== 200 ) throw response;
			if ( callback ) callback(JSON.parse(body));
		});
	};

	const signedRequest = function(url, data, callback, method = 'GET') {
		if ( !options.APISECRET ) throw 'signedRequest: Invalid API Secret';
		if ( !data ) data = {};
		data.timestamp = new Date().getTime();
		if ( typeof data.symbol !== 'undefined' ) data.symbol = data.symbol.replace('_','');
		if ( typeof data.recvWindow === 'undefined' ) data.recvWindow = options.recvWindow;
		let query = Object.keys(data).reduce(function(a,k){a.push(k+'='+encodeURIComponent(data[k]));return a},[]).join('&');
		let signature = crypto.createHmac('sha256', options.APISECRET).update(query).digest('hex'); // set the HMAC hash header
		let opt = {
			url: url+'?'+query+'&signature='+signature,
			method: method,
			timeout: options.recvWindow,
			agent: false,
			headers: {
				'User-Agent': userAgent,
				'Content-type': contentType,
				'X-MBX-APIKEY': options.APIKEY
			}
		};
		request(opt, function(error, response, body) {
			if ( error ) throw error;
			if ( response && response.statusCode !== 200 ) throw response;
			if ( callback ) callback(JSON.parse(body));
		});
	};

	const order = function(side, symbol, quantity, price, flags = {}, callback = false) {
		let endpoint = 'v3/order';
		if ( options.test ) endpoint += '/test';
		let opt = {
			symbol: symbol,
			side: side,
			type: 'LIMIT',
			quantity: quantity
		};
		if ( typeof flags.type !== 'undefined' ) opt.type = flags.type;
		if ( typeof flags.timeInForce !== 'undefined' ) opt.timeInForce = flags.timeInForce;
		if ( opt.type.includes('LIMIT') ) {
			opt.price = price;
			opt.timeInForce = 'GTC';
		}

		/*
STOP_LOSS
STOP_LOSS_LIMIT
TAKE_PROFIT
TAKE_PROFIT_LIMIT
LIMIT_MAKER
		*/
		if ( typeof flags.icebergQty !== 'undefined' ) opt.icebergQty = flags.icebergQty;
		if ( typeof flags.stopPrice !== 'undefined' ) {
			opt.stopPrice = flags.stopPrice;
			if ( opt.type === 'LIMIT' ) throw 'Error: stopPrice: Must set "type" to one of the following: STOP_LOSS, STOP_LOSS_LIMIT, TAKE_PROFIT, TAKE_PROFIT_LIMIT';
		}
		signedRequest(base+endpoint, opt, function(response) {
			if ( typeof response.msg !== 'undefined' && response.msg === 'Filter failure: MIN_NOTIONAL' ) {
				console.error('Order quantity too small. Must be > 0.01');
			}
			if ( callback ) callback(response);
			else console.log(side+'('+symbol+','+quantity+','+price+') ',response);
		}, 'POST');
	};
	////////////////////////////
	const subscribe = function(endpoint, callback, reconnect = false) {
		const ws = new WebSocket(websocket_base+endpoint);
		ws.endpoint = endpoint;
		ws.on('open', function() {
			//console.log('subscribe('+this.endpoint+')');
		});
		ws.on('close', function() {
			if ( reconnect && options.reconnect ) {
				if ( this.endpoint && parseInt(this.endpoint.length, 10) === 60 ) console.log('Account data WebSocket reconnecting..');
				else console.log('WebSocket reconnecting: '+this.endpoint);
				try {
					reconnect();
				} catch ( error ) {
					console.error('WebSocket reconnect error: '+error.message);
				}
			} else console.log('WebSocket connection closed! '+this.endpoint);
		});
		ws.on('message', function(data) {
			//console.log(data);
			try {
				callback(JSON.parse(data));
			} catch (error) {
				console.error('Parse error: '+error.message);
			}
		});
		subscriptions[endpoint] = ws;
		return ws;
	};
	const userDataHandler = function(data) {
		let type = data.e;
		if ( type === 'outboundAccountInfo' ) {
			options.balance_callback(data);
		} else if ( type === 'executionReport' ) {
			if ( options.execution_callback ) options.execution_callback(data);
		} else {
			console.error('Unexpected userData: '+type);
		}
	};
	const prevDayStreamHandler = function(data, callback) {
		let {
			e:eventType,
			E:eventTime,
			s:symbol,
			p:priceChange,
			P:percentChange,
			w:averagePrice,
			x:prevClose,
			c:close,
			Q:closeQty,
			b:bestBid,
			B:bestBidQty,
			a:bestAsk,
			A:bestAskQty,
			o:open,
			h:high,
			l:low,
			v:volume,
			q:quoteVolume,
			O:openTime,
			C:closeTime,
			F:firstTradeId,
			L:lastTradeId,
			n:numTrades
		} = data;
		callback({
			eventType,
			eventTime,
			symbol,
			priceChange,
			percentChange,
			averagePrice,
			prevClose,
			close,
			closeQty,
			bestBid,
			bestBidQty,
			bestAsk,
			bestAskQty,
			open,
			high,
			low,
			volume,
			quoteVolume,
			openTime,
			closeTime,
			firstTradeId,
			lastTradeId,
			numTrades
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
		if ( typeof data.balances === 'undefined' ) {
			console.log('balanceData error', data);
			return {};
		}
		for ( let obj of data.balances ) {
			balances[obj.asset] = {available:obj.free, onOrder:obj.locked};
		}
		return balances;
	};
	const klineData = function(symbol, interval, ticks) { // Used for /depth
		let last_time = 0;
		for ( let tick of ticks ) {
			// eslint-disable-next-line no-unused-vars
			let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
			ohlc[symbol][interval][time] = {open:open, high:high, low:low, close:close, volume:volume};
			last_time = time;
		}
		info[symbol][interval].timestamp = last_time;
	};
	const klineConcat = function(symbol, interval) { // Combine all OHLC data with latest update
		let output = ohlc[symbol][interval];
		if ( typeof ohlcLatest[symbol][interval].time === 'undefined' ) return output;
		const time = ohlcLatest[symbol][interval].time;
		const last_updated = Object.keys(ohlc[symbol][interval]).pop();
		if ( time >= last_updated ) {
			output[time] = ohlcLatest[symbol][interval];
			delete output[time].time;
			output[time].isFinal = false;
		}
		return output;
	};
	const klineHandler = function(symbol, kline, firstTime = 0) { // Used for websocket @kline
		// TODO: add Taker buy base asset volume
		// eslint-disable-next-line no-unused-vars
		let { e:eventType, E:eventTime, k:ticks } = kline;
		// eslint-disable-next-line no-unused-vars
		let { o:open, h:high, l:low, c:close, v:volume, i:interval, x:isFinal, q:quoteVolume, t:time } = ticks; //n:trades, V:buyVolume, Q:quoteBuyVolume
		if ( time <= firstTime ) return;
		if ( !isFinal ) {
			if ( typeof ohlcLatest[symbol][interval].time !== 'undefined' ) {
				if ( ohlcLatest[symbol][interval].time > time ) return;
			}
			ohlcLatest[symbol][interval] = {open:open, high:high, low:low, close:close, volume:volume, time:time};
			return;
		}
		// Delete an element from the beginning so we don't run out of memory
		const first_updated = Object.keys(ohlc[symbol][interval]).shift();
		if ( first_updated ) delete ohlc[symbol][interval][first_updated];
		ohlc[symbol][interval][time] = {open:open, high:high, low:low, close:close, volume:volume};
	};
	const depthData = function(data) { // Used for /depth endpoint
		let bids = {}, asks = {}, obj;
		if ( typeof data.bids !== 'undefined' ) {
			for ( obj of data.bids ) {
				bids[obj[0]] = parseFloat(obj[1]);
			}
		}
		if ( typeof data.asks !== 'undefined' ) {
			for ( obj of data.asks ) {
				asks[obj[0]] = parseFloat(obj[1]);
			}
		}
		return {bids:bids, asks:asks};
	}
	const depthHandler = function(depth, firstUpdateId = 0) { // Used for websocket @depth
		let symbol = depth.s, obj;
		if ( depth.u <= firstUpdateId ) return;
		for ( obj of depth.b ) { //bids
			depthCache[symbol].bids[obj[0]] = parseFloat(obj[1]);
			if ( obj[1] === '0.00000000' ) {
				delete depthCache[symbol].bids[obj[0]];
			}
		}
		for ( obj of depth.a ) { //asks
			depthCache[symbol].asks[obj[0]] = parseFloat(obj[1]);
			if ( obj[1] === '0.00000000' ) {
				delete depthCache[symbol].asks[obj[0]];
			}
		}
	};
	const getDepthCache = function(symbol) {
		if ( typeof depthCache[symbol] === 'undefined' ) return {bids: {}, asks: {}};
		return depthCache[symbol];
	};
	const depthVolume = function(symbol) { // Calculate Buy/Sell volume from DepthCache
		let cache = getDepthCache(symbol), quantity, price;
		let bidbase = 0, askbase = 0, bidqty = 0, askqty = 0;
		for ( price in cache.bids ) {
			quantity = cache.bids[price];
			bidbase+= parseFloat((quantity * parseFloat(price)).toFixed(8));
			bidqty+= quantity;
		}
		for ( price in cache.asks ) {
			quantity = cache.asks[price];
			askbase+= parseFloat((quantity * parseFloat(price)).toFixed(8));
			askqty+= quantity;
		}
		return {bids: bidbase, asks: askbase, bidQty: bidqty, askQty: askqty};
	};
	////////////////////////////
	return {
		depthCache: function(symbol) {
			return getDepthCache(symbol);
		},
		depthVolume: function(symbol) {
			return depthVolume(symbol);
		},
		percent: function(min, max, width = 100) {
			return ( min * 0.01 ) / ( max * 0.01 ) * width;
		},
		sum: function(array) {
			return array.reduce((a, b) => a + b, 0);
		},
		reverse: function(object) {
			let range = Object.keys(object).reverse(), output = {};
			for ( let price of range ) {
				output[price] = object[price];
			}
			return output;
		},
		array: function(obj) {
			return Object.keys(obj).map(function(key) {
				return [Number(key), obj[key]];
			});
		},
		sortBids: function(symbol, max = Infinity, baseValue = false) {
			let object = {}, count = 0, cache;
			if ( typeof symbol === 'object' ) cache = symbol;
			else cache = getDepthCache(symbol).bids;
			let sorted = Object.keys(cache).sort(function(a, b){return parseFloat(b)-parseFloat(a)});
			let cumulative = 0;
			for ( let price of sorted ) {
				if ( baseValue === 'cumulative' ) {
					cumulative+= parseFloat(cache[price]);
					object[price] = cumulative;
				} else if ( !baseValue ) object[price] = parseFloat(cache[price]);
				else object[price] = parseFloat((cache[price] * parseFloat(price)).toFixed(8));
				if ( ++count > max ) break;
			}
			return object;
		},
		sortAsks: function(symbol, max = Infinity, baseValue = false) {
			let object = {}, count = 0, cache;
			if ( typeof symbol === 'object' ) cache = symbol;
			else cache = getDepthCache(symbol).asks;
			let sorted = Object.keys(cache).sort(function(a, b){return parseFloat(a)-parseFloat(b)});
			let cumulative = 0;
			for ( let price of sorted ) {
				if ( baseValue === 'cumulative' ) {
					cumulative+= parseFloat(cache[price]);
					object[price] = cumulative;
				} else if ( !baseValue ) object[price] = parseFloat(cache[price]);
				else object[price] = parseFloat((cache[price] * parseFloat(price)).toFixed(8));
				if ( ++count > max ) break;
			}
			return object;
		},
		first: function(object) {
			return Object.keys(object).shift();
		},
		last: function(object) {
			return Object.keys(object).pop();
		},
		slice: function(object, start = 0) {
			return Object.entries(object).slice(start).map(entry => entry[0]);
		},
		min: function(object) {
			return Math.min.apply(Math, Object.keys(object));
		},
		max: function(object) {
			return Math.max.apply(Math, Object.keys(object));
		},
		options: function(opt) {
			options = opt;
			if ( typeof options.recvWindow === 'undefined' ) options.recvWindow = 60000;
			if ( typeof options.reconnect === 'undefined' ) options.reconnect = true;
			if ( typeof options.test === 'undefined' ) options.test = false;
		},
		buy: function(symbol, quantity, price, flags = {}, callback = false) {
			order('BUY', symbol, quantity, price, flags, callback);
		},
		sell: function(symbol, quantity, price, flags = {}, callback = false) {
			order('SELL', symbol, quantity, price, flags, callback);
		},
		marketBuy: function(symbol, quantity, callback = false) {
			order('BUY', symbol, quantity, 0, {type:'MARKET'}, callback);
		},
		marketSell: function(symbol, quantity, callback = false) {
			order('SELL', symbol, quantity, 0, {type:'MARKET'}, callback);
		},
		cancel: function(symbol, orderid, callback = false) {
			signedRequest(base+'v3/order', {symbol:symbol, orderId:orderid}, function(data) {
				if ( callback ) return callback.call(this, data, symbol);
			}, 'DELETE');
		},
		orderStatus: function(symbol, orderid, callback) {
			signedRequest(base+'v3/order', {symbol:symbol, orderId:orderid}, function(data) {
				if ( callback ) return callback.call(this, data, symbol);
			});
		},
		openOrders: function(symbol, callback) {
			let postData = symbol ? {symbol:symbol} : {};
			signedRequest(base+'v3/openOrders', postData, function(data) {
				return callback.call(this, data, symbol);
			});
		},
		cancelOrders: function(symbol, callback = false) {
			signedRequest(base+'v3/openOrders', {symbol:symbol}, function(json) {
				for ( let obj of json ) {
					let quantity = obj.origQty - obj.executedQty;
					console.log('cancel order: '+obj.side+' '+symbol+' '+quantity+' @ '+obj.price+' #'+obj.orderId);
					signedRequest(base+'v3/order', {symbol:symbol, orderId:obj.orderId}, function(data) {
						if ( callback ) return callback.call(this, data, symbol);
					}, 'DELETE');
				}
			});
		},
		allOrders: function(symbol, callback) {
			signedRequest(base+'v3/allOrders', {symbol:symbol, limit:500}, function(data) {
				if ( callback ) return callback.call(this, data, symbol);
			});
		},
		depth: function(symbol, callback, limit = 100) {
			publicRequest(base+'v1/depth', {symbol:symbol, limit:limit}, function(data) {
				return callback.call(this, depthData(data), symbol);
			});
		},
		prices: function(callback) {
			request(base+'v1/ticker/allPrices', function(error, response, body) {
				if ( !response || !body ) throw 'allPrices error: '+error;
				if ( callback ) {
					try {
						callback(priceData(JSON.parse(body)));
					} catch (error) {
						console.error('Parse error: '+error.message);
					}
				}
			});
		},
		bookTickers: function(callback) {
			request(base+'v1/ticker/allBookTickers', function(error, response, body) {
				if ( !response || !body ) throw 'allBookTickers error: '+error;
				if ( callback ) {
					try {
						callback(bookPriceData(JSON.parse(body)));
					} catch (error) {
						console.error('Parse error: '+error.message);
					}
				}
			});
		},
		prevDay: function(symbol, callback) {
			let input = symbol ? {symbol:symbol} : {};
			publicRequest(base+'v1/ticker/24hr', input, function(data) {
				if ( callback ) return callback.call(this, data, symbol);
			});
		},
		exchangeInfo: function(callback) {
			publicRequest(base+'v1/exchangeInfo', {}, callback);
		},
		withdraw: function(asset, address, amount, addressTag = false, callback = false) {
			let params = {asset, address, amount};
			params.name = 'API Withdraw';
			if ( addressTag ) params.addressTag = addressTag;
			signedRequest(wapi+'v3/withdraw.html', params, callback, 'POST');
		},
		withdrawHistory: function(callback, asset = false) {
			let params = asset ? {asset:asset} : {};
			signedRequest(wapi+'v3/withdrawHistory.html', params, callback);
		},
		depositHistory: function(callback, asset = false) {
			let params = asset ? {asset:asset} : {};
			signedRequest(wapi+'v3/depositHistory.html', params, callback);
		},
		depositAddress: function(asset, callback) {
			signedRequest(wapi+'v3/depositAddress.html', {asset:asset}, callback);
		},
		accountStatus: function(callback) {
			signedRequest(wapi+'v3/accountStatus.html', {}, callback);
		},
		account: function(callback) {
			signedRequest(base+'v3/account', {}, callback);
		},
		balance: function(callback) {
			signedRequest(base+'v3/account', {}, function(data) {
				if ( callback ) callback(balanceData(data));
			});
		},
		trades: function(symbol, callback, options) {
			signedRequest(base+'v3/myTrades', {symbol:symbol, ...options}, function(data) {
				if ( callback ) return callback.call(this, data, symbol);
			});
		},
		recentTrades: function(symbol, callback, limit = 500) {
			signedRequest(base+'v1/trades', {symbol:symbol, limit:limit}, callback);
		},
		historicalTrades: function(symbol, callback, limit = 500) {
			signedRequest(base+'v1/historicalTrades', {symbol:symbol, limit:limit}, callback);
		},
		// convert chart data to highstock array [timestamp,open,high,low,close]
		highstock: function(chart, include_volume = false) {
			let array = [];
			for ( let timestamp in chart ) {
				let obj = chart[timestamp];
				let line = [
					Number(timestamp),
					parseFloat(obj.open),
					parseFloat(obj.high),
					parseFloat(obj.low),
					parseFloat(obj.close)
				];
				if ( include_volume ) line.push(parseFloat(obj.volume));
				array.push(line);
			}
			return array;
		},
		ohlc: function(chart) {
			let open = [], high = [], low = [], close = [], volume = [];
			for ( let timestamp in chart ) { //ohlc[symbol][interval]
				let obj = chart[timestamp];
				open.push(parseFloat(obj.open));
				high.push(parseFloat(obj.high));
				low.push(parseFloat(obj.low));
				close.push(parseFloat(obj.close));
				volume.push(parseFloat(obj.volume));
			}
			return {open:open, high:high, low:low, close:close, volume:volume};
		},
		candlesticks: function(symbol, interval = '5m', callback) { //1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
			publicRequest(base+'v1/klines', {symbol:symbol, interval:interval}, function(data) {
				return callback.call(this, data, symbol);
			});
		},
		publicRequest: function(url, data, callback, method = 'GET') {
			publicRequest(url, data, callback, method)
		},
		signedRequest: function(url, data, callback, method = 'GET') {
			signedRequest(url, data, callback, method);
		},
		getMarket: function(symbol) {
			const substring = symbol.substr(-3);
			if ( substring === 'BTC' ) return 'BTC';
			else if ( substring === 'ETH' ) return 'ETH';
			else if ( substring === 'BNB' ) return 'BNB';
			else if ( symbol.substr(-4) === 'USDT' ) return 'USDT';
		},
		websockets: {
			userData: function userData(callback, execution_callback = false) {
				let reconnect = function() {
					if ( options.reconnect ) userData(callback, execution_callback);
				};
				apiRequest(base+'v1/userDataStream', function(response) {
					options.listenKey = response.listenKey;
					setInterval(function() { // keepalive
						try {
							apiRequest(base+'v1/userDataStream?listenKey='+options.listenKey, false, 'PUT');
						} catch ( error ) {
							//error.message
						}
					}, 60 * 30 * 1000); // 30 minute keepalive
					options.balance_callback = callback;
					options.execution_callback = execution_callback;
					subscribe(options.listenKey, userDataHandler, reconnect);
				},'POST');
			},
			subscribe: function(url, callback, reconnect = false) {
				return subscribe(url, callback, reconnect);
			},
			subscriptions: function() {
				return subscriptions;
			},
			terminate: function(endpoint) {
				let ws = subscriptions[endpoint];
				if ( !ws ) return;
				console.log('WebSocket terminated:', endpoint);
				ws.terminate();
				delete subscriptions[endpoint];
			},
			depth: function depth(symbols, callback) {
				for ( let symbol of symbols ) {
					subscribe(symbol.toLowerCase()+'@depth', callback);
				}
			},
			depthCache: function depthCacheFunction(symbols, callback, limit = 500) {
				if ( typeof symbols === 'string' ) symbols = [symbols]; // accept both strings and arrays
				for ( let symbol of symbols ) {
					if ( typeof info[symbol] === 'undefined' ) info[symbol] = {};
					info[symbol].firstUpdateId = 0;
					depthCache[symbol] = {bids: {}, asks: {}};
					messageQueue[symbol] = [];
					let reconnect = function() {
						if ( options.reconnect ) depthCacheFunction([symbol], callback);
					};
					subscribe(symbol.toLowerCase()+'@depth', function(depth) {
						if ( !info[symbol].firstUpdateId ) {
							if ( typeof messageQueue[symbol] === 'undefined' ) messageQueue[symbol] = [];
							messageQueue[symbol].push(depth);
							return;
						}
						depthHandler(depth);
						if ( callback ) callback(symbol, depthCache[symbol]);
					}, reconnect);
					publicRequest(base+'v1/depth', {symbol:symbol, limit:limit}, function(json) {
						if ( messageQueue && typeof messageQueue[symbol] === 'object' ) {
							info[symbol].firstUpdateId = json.lastUpdateId;
							depthCache[symbol] = depthData(json);
							for ( let depth of messageQueue[symbol] ) {
								depthHandler(depth, json.lastUpdateId);
							}
							delete messageQueue[symbol];
							if ( callback ) callback(symbol, depthCache[symbol]);
						}
					});
				}
			},
			trades: function(symbols, callback) {
				for ( let symbol of symbols ) {
					let reconnect = function() {
						if ( options.reconnect ) subscribe(symbol.toLowerCase()+'@aggTrade', callback);
					};
					subscribe(symbol.toLowerCase()+'@aggTrade', callback, reconnect);
				}
			},
			chart: function chart(symbols, interval, callback) {
				if ( typeof symbols === 'string' ) symbols = [symbols]; // accept both strings and arrays
				for ( let symbol of symbols ) {
					if ( typeof info[symbol] === 'undefined' ) info[symbol] = {};
					if ( typeof info[symbol][interval] === 'undefined' ) info[symbol][interval] = {};
					if ( typeof ohlc[symbol] === 'undefined' ) ohlc[symbol] = {};
					if ( typeof ohlc[symbol][interval] === 'undefined' ) ohlc[symbol][interval] = {};
					if ( typeof ohlcLatest[symbol] === 'undefined' ) ohlcLatest[symbol] = {};
					if ( typeof ohlcLatest[symbol][interval] === 'undefined' ) ohlcLatest[symbol][interval] = {};
					if ( typeof klineQueue[symbol] === 'undefined' ) klineQueue[symbol] = {};
					if ( typeof klineQueue[symbol][interval] === 'undefined' ) klineQueue[symbol][interval] = [];
					info[symbol][interval].timestamp = 0;
					let reconnect = function() {
						if ( options.reconnect ) chart(symbols, interval, callback);
					};
					subscribe(symbol.toLowerCase()+'@kline_'+interval, function(kline) {
						if ( !info[symbol][interval].timestamp ) {
							klineQueue[symbol][interval].push(kline);
							return;
						}
						//console.log('@klines at ' + kline.k.t);
						klineHandler(symbol, kline);
						if ( callback ) callback(symbol, interval, klineConcat(symbol, interval));
					}, reconnect);
					publicRequest(base+'v1/klines', {symbol:symbol, interval:interval}, function(data) {
						klineData(symbol, interval, data);
						//console.log('/klines at ' + info[symbol][interval].timestamp);
						for ( let kline of klineQueue[symbol][interval] ) {
							klineHandler(symbol, kline, info[symbol][interval].timestamp);
						}
						delete klineQueue[symbol][interval];
						if ( callback ) callback(symbol, interval, klineConcat(symbol, interval));
					});
				}
			},
			candlesticks: function candlesticks(symbols, interval, callback) {
				let reconnect = function() {
					if ( options.reconnect ) candlesticks(symbols, interval, callback);
				};
				for ( let symbol of symbols ) {
					subscribe(symbol.toLowerCase()+'@kline_'+interval, callback, reconnect);
				}
			},
			prevDay: function prevDay(symbol, callback) {
				let streamName = symbol ? symbol.toLowerCase()+'@ticker' : '!ticker@arr';
				let reconnect = function() {
					if ( options.reconnect ) prevDay(symbol, callback);
				};
				subscribe(streamName, function(data) {
					if ( data instanceof Array ) {
						for ( let line of data ) {
							prevDayStreamHandler(line, callback);
						}
						return;
					}
					prevDayStreamHandler(data, callback);
				}, reconnect);
			}
		}
	};
}();
//https://github.com/binance-exchange/binance-official-api-docs
