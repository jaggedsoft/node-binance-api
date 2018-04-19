/* ============================================================
 * node-binance-api
 * https://github.com/jaggedsoft/node-binance-api
 * ============================================================
 * Copyright 2017-, Jon Eyrick
 * Released under the MIT License
 * ============================================================ */

/**
 * Node Binance Api
 * @module jaggedsoft/node-binance-api
 */
module.exports = function() {
    'use strict';
    const WebSocket = require('ws');
    const request = require('request');
    const crypto = require('crypto');
    const file = require('fs');
    const url = require('url');
    const HttpsProxyAgent = require('https-proxy-agent');
    const stringHash = require('string-hash');
    const base = 'https://api.binance.com/api/';
    const wapi = 'https://api.binance.com/wapi/';
    const stream = 'wss://stream.binance.com:9443/ws/';
    const combineStream = 'wss://stream.binance.com:9443/stream?streams=';
    const userAgent = 'Mozilla/4.0 (compatible; Node Binance API)';
    const contentType = 'application/x-www-form-urlencoded';
    let subscriptions = {};
    let depthCache = {};
    let depthCacheContext = {};
    let ohlcLatest = {};
    let klineQueue = {};
    let ohlc = {};
    const default_options = {
        recvWindow: 60000, // to be lowered to 5000 in v0.5
        useServerTime: false,
        reconnect: true,
        verbose: false,
        test: false,
        log: function(...args) {
            console.log(Array.prototype.slice.call(args));
        }
    };
    let options = default_options;
    let info = { timeOffset: 0 };
    let socketHeartbeatInterval;

    /**
     * Create a http request to the public API
     * @param {string} url - The http endpoint
     * @param {object} data - The data to send
     * @param {function} callback - The callback method to call
     * @param {string} method - the http method
     * @return {undefined}
     */
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
            if ( !callback ) return;

            if ( error ) return callback( error, {});

            if ( response && response.statusCode !== 200 ) return callback( response, {} );

            return callback( null, JSON.parse(body) );
        });
    };

    /**
     * Checks to see of the boject is iterable
     * @param {object} obj - The object check
     * @return {boolean} true or false is iterable
     */
    const isIterable = function(obj) {
      // checks for null and undefined
      if (obj === null) {
        return false;
      }
      return typeof obj[Symbol.iterator] === 'function';
    }

    /**
     * Create a http request to the public API
     * @param {string} url - The http endpoint
     * @param {function} callback - The callback method to call
     * @param {string} method - the http method
     * @return {undefined}
     */
    const apiRequest = function(url, callback, method = 'GET') {
        if ( !options.APIKEY ) throw Error('apiRequest: Invalid API Key');
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
            if ( !callback ) return;

            if ( error ) return callback( error, {} );

            if ( response && response.statusCode !== 200 ) return callback( response, {} );

            return callback( null, JSON.parse(body) );
        });
    };

    /**
     * Make market request
     * @param {string} url - The http endpoint
     * @param {object} data - The data to send
     * @param {function} callback - The callback method to call
     * @param {string} method - the http method
     * @return {undefined}
     */
    const marketRequest = function(url, data, callback, method = 'GET') {
        if ( !data ) data = {};
        let query = Object.keys(data).reduce(function(a,k){a.push(k+'='+encodeURIComponent(data[k]));return a},[]).join('&');
        let opt = {
            url: url+'?'+query,
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
            if ( !callback ) return;

            if ( error ) return callback( error, {} );

            if ( response && response.statusCode !== 200 ) return callback( response, {} );

            return callback( null, JSON.parse(body) );
        });
    };

    /**
     * Create a signed http request to the signed API
     * @param {string} url - The http endpoint
     * @param {object} data - The data to send
     * @param {function} callback - The callback method to call
     * @param {string} method - the http method
     * @return {undefined}
     */
    const signedRequest = function(url, data, callback, method = 'GET') {
        if ( !options.APISECRET ) throw Error('signedRequest: Invalid API Secret');
        if ( !data ) data = {};
        data.timestamp = new Date().getTime() + info.timeOffset;
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
            if ( !callback ) return;

            if ( error ) return callback( error, {} );

            if ( response && response.statusCode !== 200 ) return callback( response, {} );

            return callback( null, JSON.parse(body) );
        });
    };

    /**
     * Create a signed http request to the signed API
     * @param {string} side - BUY or SELL
     * @param {string} symbol - The symbol to buy or sell
     * @param {string} quantity - The quantity to buy or sell
     * @param {string} price - The price per unit to transact each unit at
     * @param {object} flags - additional order settings
     * @param {function} callback - the callback function
     * @return {undefined}
     */
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
        if ( opt.type.includes('LIMIT') ) {
            opt.price = price;
            opt.timeInForce = 'GTC';
        }
        if ( typeof flags.timeInForce !== 'undefined' ) opt.timeInForce = flags.timeInForce;
        if ( typeof flags.newOrderRespType !== 'undefined' ) opt.newOrderRespType = flags.newOrderRespType;
        if ( typeof flags.newClientOrderId !== 'undefined' ) opt.newClientOrderId = flags.newClientOrderId;

        /*
         * STOP_LOSS
         * STOP_LOSS_LIMIT
         * TAKE_PROFIT
         * TAKE_PROFIT_LIMIT
         * LIMIT_MAKER
         */
        if ( typeof flags.icebergQty !== 'undefined' ) opt.icebergQty = flags.icebergQty;
        if ( typeof flags.stopPrice !== 'undefined' ) {
            opt.stopPrice = flags.stopPrice;
            if ( opt.type === 'LIMIT' ) throw Error('stopPrice: Must set "type" to one of the following: STOP_LOSS, STOP_LOSS_LIMIT, TAKE_PROFIT, TAKE_PROFIT_LIMIT');
        }
        signedRequest(base+endpoint, opt, function(error, response) {
            if ( !response ) {
                if ( callback ) callback(error, response);
                else options.log('Order() error:', error);
                return;
            }
            if ( typeof response.msg !== 'undefined' && response.msg === 'Filter failure: MIN_NOTIONAL' ) {
                options.log('Order quantity too small. See exchangeInfo() for minimum amounts');
            }
            if ( callback ) callback(error, response);
            else options.log(side+'('+symbol+','+quantity+','+price+') ',response);
        }, 'POST');
    };

    /**
     * No-operation function
     * @return {undefined}
     */
    const noop = function() {
        // do nothing
    };

    /**
     * Reworked Tuitio's heartbeat code into a shared single interval tick
     * @return {undefined}
     */
    const socketHeartbeat = function() {

        /* sockets removed from `subscriptions` during a manual terminate()
           will no longer be at risk of having functions called on them */
        for ( let endpointId in subscriptions ) {
            const ws = subscriptions[endpointId];
            if ( ws.isAlive ) {
                ws.isAlive = false;
                if ( ws.readyState === WebSocket.OPEN) ws.ping(noop);
            } else {
                if ( options.verbose ) options.log('Terminating inactive/broken WebSocket: '+ws.endpoint);
                if ( ws.readyState === WebSocket.OPEN) ws.terminate();
            }
        }
    };

    /**
     * Called when socket is opened, subscriptiosn are registered for later reference
     * @param {function} opened_callback - a callback function
     * @return {undefined}
     */
    const handleSocketOpen = function(opened_callback) {
        this.isAlive = true;
        if (Object.keys(subscriptions).length === 0) {
            socketHeartbeatInterval = setInterval(socketHeartbeat, 30000);
        }
        subscriptions[this.endpoint] = this;
        if ( typeof opened_callback === 'function' ) opened_callback(this.endpoint);
    };

    /**
     * Called when socket is closed, subscriptiosn are deregistered for later reference
     * @param {boolean} reconnect - true or false to reconnect the socket
     * @param {string} code - code associated with the socket
     * @param {string} reason - string with the response
     * @return {undefined}
     */
    const handleSocketClose = function(reconnect, code, reason) {
        delete subscriptions[this.endpoint];
        if (Object.keys(subscriptions).length === 0) {
            clearInterval(socketHeartbeatInterval);
        }
        options.log('WebSocket closed: '+this.endpoint+
            (code ? ' ('+code+')' : '')+
            (reason ? ' '+reason : ''));
        if ( options.reconnect && this.reconnect && reconnect ) {
            if ( parseInt(this.endpoint.length, 10) === 60 ) options.log('Account data WebSocket reconnecting...');
            else options.log('WebSocket reconnecting: '+this.endpoint+'...');
            try {
                reconnect();
            } catch ( error ) {
                options.log('WebSocket reconnect error: '+error.message);
            }
        }
    };

    /**
     * Called when socket errors
     * @param {object} error - error object message
     * @return {undefined}
     */
    const handleSocketError = function(error) {

        /* Errors ultimately result in a `close` event.
           see: https://github.com/websockets/ws/blob/828194044bf247af852b31c49e2800d557fedeff/lib/websocket.js#L126 */
        options.log('WebSocket error: '+this.endpoint+
            (error.code ? ' ('+error.code+')' : '')+
            (error.message ? ' '+error.message : ''));
    };

    /**
     * Called each time the socket heartsbeats
     * @return {undefined}
     */
    const handleSocketHeartbeat = function() {
        this.isAlive = true;
    };

    /**
     * Used to subscribe to a aingle websocket endpoint
     * @param {string} endpoint - endpoint to connect to
     * @param {function} callback - the function to called when infomration is received
     * @param {boolean} reconnect - whether to reocnect on disconnect
     * @param {object} opened_callback - the function to called when opened
     * @return {WebSocket} - websocket reference
     */
    const subscribe = function(endpoint, callback, reconnect = false, opened_callback = false) {

        let proxy = process.env.https_proxy || false;
        let ws = false;

        if ( proxy !== false ) {
            if ( options.verbose ) options.log('using proxy server ' + proxy);
            let options = url.parse(proxy);
            let agent = new HttpsProxyAgent(options);
            ws = new WebSocket(stream+endpoint, { agent: agent });
        } else {
            ws = new WebSocket(stream+endpoint);
        }

        if ( options.verbose ) options.log('Subscribed to '+endpoint);
        ws.reconnect = options.reconnect;
        ws.endpoint = endpoint;
        ws.isAlive = false;
        ws.on('open', handleSocketOpen.bind(ws, opened_callback));
        ws.on('pong', handleSocketHeartbeat);
        ws.on('error', handleSocketError);
        ws.on('close', handleSocketClose.bind(ws, reconnect));
        ws.on('message', function(data) {
            try {
                callback(JSON.parse(data));
            } catch (error) {
                options.log('Parse error: '+error.message);
            }
        });
        return ws;
    };

    /**
     * Used to subscribe to a combined websocket endpoint
     * @param {string} streams - streams to connect to
     * @param {function} callback - the function to called when infomration is received
     * @param {boolean} reconnect - whether to reocnect on disconnect
     * @param {object} opened_callback - the function to called when opened
     * @return {WebSocket} - websocket reference
     */
    const subscribeCombined = function(streams, callback, reconnect = false, opened_callback = false) {

        let proxy = process.env.https_proxy || false;
        const queryParams = streams.join('/');
        let ws = false;

        if ( proxy !== false ) {
            if ( options.verbose ) options.log('using proxy server %j'+ proxy);
            let options = url.parse(proxy);
            let agent = new HttpsProxyAgent(options);
            ws = new WebSocket(combineStream+queryParams, { agent: agent });
        } else {
            ws = new WebSocket(combineStream+queryParams);
        }

        ws.reconnect = options.reconnect;
        ws.endpoint = stringHash(queryParams);
        ws.isAlive = false;
        if ( options.verbose ) {
            options.log('CombinedStream: Subscribed to ['+ws.endpoint+'] '+queryParams);
        }
        ws.on('open', handleSocketOpen.bind(ws, opened_callback));
        ws.on('pong', handleSocketHeartbeat);
        ws.on('error', handleSocketError);
        ws.on('close', handleSocketClose.bind(ws, reconnect));
        ws.on('message', function(data) {
            try {
                callback(JSON.parse(data).data);
            } catch (error) {
                options.log('CombinedStream: Parse error: '+error.message);
            }
        });
        return ws;
    };

    /**
     * Used as part of the userdata websockets callback
     * @param {object} data - user data callback data type
     * @return {undefined}
     */
    const userDataHandler = function(data) {
        let type = data.e;
        if ( type === 'outboundAccountInfo' ) {
            options.balance_callback(data);
        } else if ( type === 'executionReport' ) {
            if ( options.execution_callback ) options.execution_callback(data);
        } else {
            options.log('Unexpected userData: '+type);
        }
    };

    /**
     * Parses the previous day stream and calls the user callback with fiendly object
     * @param {object} data - user data callback data type
     * @param {function} callback - user data callback data type
     * @return {undefined}
     */
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
        callback(null, {
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

    /**
     * Gets the price of a given symbol or symbols
     * @param {array} data - array of symbols
     * @return {array} - symbols with their current prices
     */
    const priceData = function(data) {
        const prices = {};
        if ( Array.isArray(data) ) {
            for ( let obj of data ) {
                prices[obj.symbol] = obj.price;
            }
        } else { // Single price returned
            prices[data.symbol] = data.price;
        }
        return prices;
    };

    /**
     * Used by bookTickers to format the bids and asks given given symbols
     * @param {array} data - array of symbols
     * @return {object} - symbols with their bids and asks data
     */
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

    /**
     * Used by balance to get the balance data
     * @param {array} data - account info object
     * @return {object} - balances hel with available, onorder amounts
     */
    const balanceData = function(data) {
        let balances = {};
        if ( typeof data === 'undefined' ) return {};
        if ( typeof data.balances === 'undefined' ) {
            options.log('balanceData error', data);
            return {};
        }
        for ( let obj of data.balances ) {
            balances[obj.asset] = {available:obj.free, onOrder:obj.locked};
        }
        return balances;
    };

    /**
     * Used by web sockets depth and populates ohlc and info
     * @param {string} symbol - symbol to get candlestick info
     * @param {string} interval - time interval, 1m, 3m, 5m ....
     * @param {array} ticks - tick array
     * @return {undefined}
     */
    const klineData = function(symbol, interval, ticks) { // Used for /depth
        let last_time = 0;
        if (isIterable(ticks)) {
          for ( let tick of ticks ) {
              // eslint-disable-next-line no-unused-vars
              let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
              ohlc[symbol][interval][time] = {open:open, high:high, low:low, close:close, volume:volume};
              last_time = time;
          }

          info[symbol][interval].timestamp = last_time;
        }
    };

    /**
     * Combines all OHLC data with latest update
     * @param {string} symbol - the symbol
     * @param {string} interval - time interval, 1m, 3m, 5m ....
     * @return {array} - interval data for given symbol
     */
    const klineConcat = function(symbol, interval) {
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

    /**
     * Used for websocket @kline
     * @param {string} symbol - the symbol
     * @param {object} kline - object with kline info
     * @param {string} firstTime - time filter
     * @return {undefined}
     */
    const klineHandler = function(symbol, kline, firstTime = 0) {
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

    /**
     * Used for /depth endpoint
     * @param {object} data - containing the bids and asks
     * @return {undefined}
     */
    const depthData = function(data) {
        if ( !data ) return {bids:[], asks:[]};
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
        return {lastUpdateId: data.lastUpdateId, bids:bids, asks:asks};
    }

    /**
     * Used for /depth endpoint
     * @param {object} depth - information
     * @return {undefined}
     */
    const depthHandler = function(depth) {
        let symbol = depth.s, obj;
        let context = depthCacheContext[symbol];
        // This now conforms 100% to the Binance docs constraints on managing a local order book
        if ( !context.lastEventUpdateId && (depth.U > context.snapshotUpdateId + 1 || depth.u < context.snapshotUpdateId + 1 )) {

            /* I think if the count exceeded 1 we could deem the cache out of sync. But we'll
               be lenient and give the cache up to a count of 3 before calling it out of sync. */
            if ( ++context.skipCount > 2 ) {
                const msg = 'depthHandler: ['+symbol+'] Skip count exceeded. The depth cache is out of sync.';
                if ( options.verbose ) options.log(msg);
                throw new Error(msg);
            }
        } else if ( context.lastEventUpdateId && depth.U !== context.lastEventUpdateId + 1 ) {
            const msg = 'depthHandler: ['+symbol+'] Incorrect update ID. The depth cache is out of sync.';
            if ( options.verbose ) options.log(msg);
            throw new Error(msg);
        } else {
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
            context.skipCount = 0;
            context.lastEventUpdateId = depth.u;
        }
    };

    /**
     * Gets depth cache for given symbol
     * @param {string} symbol - the symbol to fetch
     * @return {object} - the depth cache object
     */
    const getDepthCache = function(symbol) {
        if ( typeof depthCache[symbol] === 'undefined' ) return {bids: {}, asks: {}};
        return depthCache[symbol];
    };

    /**
     * Calculate Buy/Sell volume from DepthCache
     * @param {string} symbol - the symbol to fetch
     * @return {object} - the depth volume cache object
     */
    const depthVolume = function(symbol) {
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

    /**
     * Checks whether or not an array contains any duplicate elements
     *  Note(keith1024): at the moment this only works for primitive types,
     *  will require modification to work with objects
     * @param {array} array - the array to check
     * @return {boolean} - true or false
     */
    const isArrayUnique = function(array) {
        return array.every(function(el, pos, arr) {
            return arr.indexOf(el) === pos;
        });
    };
    return {

        /**
        * Gets depth cache for given symbol
        * @param {symbol} symbol - get depch cache for this symbol
        * @return {object} - object
        */
        depthCache: function(symbol) {
            return getDepthCache(symbol);
        },

        /**
        * Gets depth volume for given symbol
        * @param {symbol} symbol - get depch volume for this symbol
        * @return {object} - object
        */
        depthVolume: function(symbol) {
            return depthVolume(symbol);
        },

        /**
        * Count decimal places
        * @param {float} float - get depch volume for this symbol
        * @return {int} - number of place
        */
		getPrecision: function(float) { //
			return float.toString().split('.')[1].length || 0;
		},

        /**
        * rounds number with given step
        * @param {float} number - number to round
        * @param {float} stepSize - step size
        * @return {float} - number
        */
        roundStep: function(number, stepSize) {
            const precision = stepSize.toString().split('.')[1].length || 0;
            return (( (number / stepSize) | 0 ) * stepSize).toFixed(precision);
        },

        /**
        * Gets percetage of given numbers
        * @param {float} min - the smaller number
        * @param {float} max - the bigger number
        * @param {int} width - percentage width
        * @return {float} - percentage
        */
        percent: function(min, max, width = 100) {
            return ( min * 0.01 ) / ( max * 0.01 ) * width;
        },

        /**
        * Gets the sum of an array of numbers
        * @param {array} array - the number to add
        * @return {float} - sum
        */
        sum: function(array) {
            return array.reduce((a, b) => a + b, 0);
        },

        /**
        * Reversses the keys of an object
        * @param {object} object - the object
        * @return {object} - the object
        */
        reverse: function(object) {
            let range = Object.keys(object).reverse(), output = {};
            for ( let price of range ) {
                output[price] = object[price];
            }
            return output;
        },

        /**
        * Converts an object to an array
        * @param {object} obj - the object
        * @return {array} - the array
        */
        array: function(obj) {
            return Object.keys(obj).map(function(key) {
                return [Number(key), obj[key]];
            });
        },

        /**
        * Sorts bids
        * @param {string} symbol - the object
        * @param {int} max - the max number of bids
        * @param {string} baseValue - the object
        * @return {object} - the object
        */
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
                if ( ++count >= max ) break;
            }
            return object;
        },

        /**
        * Sorts asks
        * @param {string} symbol - the object
        * @param {int} max - the max number of bids
        * @param {string} baseValue - the object
        * @return {object} - the object
        */
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
                if ( ++count >= max ) break;
            }
            return object;
        },

        /**
        * Returns the first property of an object
        * @param {object} object - the object to get the first member
        * @return {string} - the object key
        */
        first: function(object) {
            return Object.keys(object).shift();
        },

        /**
        * Returns the last property of an object
        * @param {object} object - the object to get the first member
        * @return {string} - the object key
        */
        last: function(object) {
            return Object.keys(object).pop();
        },

        /**
        * Returns an array of properties starting at start
        * @param {object} object - the object to get the properties form
        * @param {int} start - the starting index
        * @return {array} - the array of entires
        */
        slice: function(object, start = 0) {
            return Object.entries(object).slice(start).map(entry => entry[0]);
        },

        /**
        * Gets the minimum key form object
        * @param {object} object - the object to get the properties form
        * @return {string} - the minimum key
        */
        min: function(object) {
            return Math.min.apply(Math, Object.keys(object));
        },

        /**
        * Gets the maximum key form object
        * @param {object} object - the object to get the properties form
        * @return {string} - the minimum key
        */
        max: function(object) {
            return Math.max.apply(Math, Object.keys(object));
        },

        /**
        * Sets an option fiven a key and value
        * @param {string} key - the key to set
        * @param {object} value - the value of the key
        * @return {undefined}
        */
        setOption: function(key, value) {
            options[key] = value;
        },

        /**
        * Gets an option fiven a key
        * @param {string} key - the key to set
        * @return {undefined}
        */
        getOption: function(key) {
            return options[key];
        },

        /**
        * returns the entire info object
        * @return {object} - the info object
        */
        getInfo: function() {
            return info;
        },

        /**
        * returns the entire options object
        * @return {object} - the options object
        */
        getOptions: function() {
            return options;
        },

        /**
        * Gets an option fiven a key
        * @param {object} opt - the object with the class configuration
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        options: function(opt, callback = false) {
            if ( typeof opt === 'string' ) { // Pass json config filename
                options = JSON.parse(file.readFileSync(opt));
            } else options = opt;
            if ( typeof options.recvWindow === 'undefined' ) options.recvWindow = default_options.recvWindow;
            if ( typeof options.useServerTime === 'undefined' ) options.useServerTime = default_options.useServerTime;
            if ( typeof options.reconnect === 'undefined' ) options.reconnect = default_options.reconnect;
            if ( typeof options.test === 'undefined' ) options.test = default_options.test;
            if ( typeof options.log === 'undefined' ) options.log = default_options.log;
            if ( typeof options.verbose === 'undefined' ) options.verbose = default_options.verbose;
            if ( options.useServerTime ) {
                apiRequest(base+'v1/time', function(error, response) {
                    info.timeOffset = response.serverTime - new Date().getTime();
                    //options.log("server time set: ", response.serverTime, info.timeOffset);
                    if ( callback ) callback();
                });
            } else if ( callback ) callback();
        },

        /**
        * Creates a buy order
        * @param {string} symbol - the symbol to buy
        * @param {numeric} quantity - the quanitity required
        * @param {numeric} price - the price to pay for each unit
        * @param {object} flags - addtional buy order flags
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        buy: function(symbol, quantity, price, flags = {}, callback = false) {
            order('BUY', symbol, quantity, price, flags, callback);
        },

        /**
        * Creates a sell order
        * @param {string} symbol - the symbol to sell
        * @param {numeric} quantity - the quanitity required
        * @param {numeric} price - the price to sell each unit for
        * @param {object} flags - addtional sell order flags
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        sell: function(symbol, quantity, price, flags = {}, callback = false) {
            order('SELL', symbol, quantity, price, flags, callback);
        },

        /**
        * Creates a market buy order
        * @param {string} symbol - the symbol to buy
        * @param {numeric} quantity - the quanitity required
        * @param {object} flags - addtional buy order flags
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        marketBuy: function(symbol, quantity, flags = {type:'MARKET'}, callback = false) {
            if ( typeof flags === 'function' ) { // Accept callback as third parameter
                callback = flags;
                flags = {type:'MARKET'};
            }
            if ( typeof flags.type === 'undefined' ) flags.type = 'MARKET';
            order('BUY', symbol, quantity, 0, flags, callback);
        },

        /**
        * Creates a market sell order
        * @param {string} symbol - the symbol to sell
        * @param {numeric} quantity - the quanitity required
        * @param {object} flags - addtional sell order flags
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        marketSell: function(symbol, quantity, flags = {type:'MARKET'}, callback = false) {
            if ( typeof flags === 'function' ) { // Accept callback as third parameter
                callback = flags;
                flags = {type:'MARKET'};
            }
            if ( typeof flags.type === 'undefined' ) flags.type = 'MARKET';
            order('SELL', symbol, quantity, 0, flags, callback);
        },

        /**
        * Cancels an order
        * @param {string} symbol - the symbol to cancel
        * @param {string} orderid - the orderid to cancel
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        cancel: function(symbol, orderid, callback = false) {
            signedRequest(base+'v3/order', {symbol:symbol, orderId:orderid}, function(error, data) {
                if ( callback ) return callback.call(this, error, data, symbol);
            }, 'DELETE');
        },

        /**
        * Cancels an order
        * @param {string} symbol - the symbol to check
        * @param {string} orderid - the orderid to check
        * @param {function} callback - the callback function
        * @param {object} flags - any addtional flags
        * @return {undefined}
        */
        orderStatus: function(symbol, orderid, callback, flags = {}) {
            let parameters = Object.assign({symbol:symbol, orderId:orderid}, flags);
            signedRequest(base+'v3/order', parameters, function(error, data) {
                if ( callback ) return callback.call(this, error, data, symbol);
            });
        },

        /**
        * Gets open orders
        * @param {string} symbol - the symbol to get
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        openOrders: function(symbol, callback) {
            let parameters = symbol ? {symbol:symbol} : {};
            signedRequest(base+'v3/openOrders', parameters, function(error, data) {
                return callback.call(this, error, data, symbol);
            });
        },

        /**
        * Cancels all order of a given sumbol
        * @param {string} symbol - the symbol to cancel all orders for
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        cancelOrders: function(symbol, callback = false) {
            signedRequest(base+'v3/openOrders', {symbol:symbol}, function(error, json) {
                if ( json.length === 0 ) {
                    if ( callback ) return callback.call(this, 'No orders present for this symbol', {}, symbol);
                }
                for ( let obj of json ) {
                    let quantity = obj.origQty - obj.executedQty;
                    options.log('cancel order: '+obj.side+' '+symbol+' '+quantity+' @ '+obj.price+' #'+obj.orderId);
                    signedRequest(base+'v3/order', {symbol:symbol, orderId:obj.orderId}, function(error, data) {
                        if ( callback ) return callback.call(this, error, data, symbol);
                    }, 'DELETE');
                }
            });
        },

        /**
        * Gets all order of a given sumbol
        * @param {string} symbol - the symbol
        * @param {function} callback - the callback function
        * @param {object} options - addtional options
        * @return {undefined}
        */
        allOrders: function(symbol, callback, options = {}) {
            let parameters = Object.assign({symbol:symbol}, options);
            signedRequest(base+'v3/allOrders', parameters, function(error, data) {
                if ( callback ) return callback.call(this, error, data, symbol);
            });
        },

        /**
        * Gets the depth infomrmation for a given symbol
        * @param {string} symbol - the symbol
        * @param {function} callback - the callback function
        * @param {int} limit - limit the number of returned orders
        * @return {undefined}
        */
        depth: function(symbol, callback, limit = 100) {
            publicRequest(base+'v1/depth', {symbol:symbol, limit:limit}, function(error, data) {
                return callback.call(this, error, depthData(data), symbol);
            });
        },

        /**
        * Gets the prices of a given symbol(s)
        * @param {string} symbol - the symbol
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        prices: function(symbol, callback = false) {
            const params = typeof symbol === 'string' ? '?symbol='+symbol : '';
            if ( typeof symbol === 'function' ) callback = symbol; // backwards compatibility
            request(base+'v3/ticker/price'+params, function(error, response, body) {
                if ( !callback ) return;

                if ( error ) return callback( error );

                if ( response && response.statusCode !== 200 ) return callback( response );

                if ( callback ) return callback( null, priceData(JSON.parse(body)) );
            });
        },

        /**
        * Gets the booktickers of given symbol(s)
        * @param {string} symbol - the symbol
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        bookTickers: function(symbol, callback) {
            const params = typeof symbol === 'string' ? '?symbol='+symbol : '';
            if ( typeof symbol === 'function' ) callback = symbol; // backwards compatibility
            request(base+'v3/ticker/bookTicker'+params, function(error, response, body) {
                if ( !callback ) return;

                if ( error ) return callback( error );

                if ( response && response.statusCode !== 200 ) return callback( response );

                if ( callback ) {
                    const result = symbol ? JSON.parse(body) : bookPriceData(JSON.parse(body));
                    return callback( null, result );
                }
            });
        },

        /**
        * Gets the prevday percentage change
        * @param {string} symbol - the symbol or symbols
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        prevDay: function(symbol, callback) {
            let input = symbol ? {symbol:symbol} : {};
            publicRequest(base+'v1/ticker/24hr', input, function(error, data) {
                if ( callback ) return callback.call(this, error, data, symbol);
            });
        },

        /**
        * Gets the the exchange info
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        exchangeInfo: function(callback) {
            publicRequest(base+'v1/exchangeInfo', {}, callback);
        },

        /**
        * Gets the the system status
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        systemStatus: function(callback) {
            publicRequest(wapi+'v3/systemStatus.html', {}, callback);
        },

        /**
        * Withdraws asset to given wallet id
        * @param {string} asset - the asset symbol
        * @param {string} address - the wallet to transfer it to
        * @param {number} amount - the amount to transfer
        * @param {string} addressTag - and addtional address tag
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        withdraw: function(asset, address, amount, addressTag = false, callback = false) {
            let params = {asset, address, amount};
            params.name = 'API Withdraw';
            if ( addressTag ) params.addressTag = addressTag;
            signedRequest(wapi+'v3/withdraw.html', params, callback, 'POST');
        },

        /**
        * Get the Withdraws history for a given asset
        * @param {function} callback - the callback function
        * @param {string} asset - the asset symbol
        * @return {undefined}
        */
        withdrawHistory: function(callback, asset = false) {
            let params = asset ? {asset:asset} : {};
            signedRequest(wapi+'v3/withdrawHistory.html', params, callback);
        },

        /**
        * Get the deposit history
        * @param {function} callback - the callback function
        * @param {object} params - addtional aprams
        * @return {undefined}
        */
        depositHistory: function(callback, params = {}) {
            if ( typeof params === 'string' ) params = {asset:params}; // Support 'asset' (string) or optional parameters (object)
            signedRequest(wapi+'v3/depositHistory.html', params, callback);
        },

        /**
        * Get the deposit history for given asset
        * @param {string} asset - the asset
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        depositAddress: function(asset, callback) {
            signedRequest(wapi+'v3/depositAddress.html', {asset:asset}, callback);
        },

        /**
        * Get the account status
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        accountStatus: function(callback) {
            signedRequest(wapi+'v3/accountStatus.html', {}, callback);
        },

        /**
        * Get the account
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        account: function(callback) {
            signedRequest(base+'v3/account', {}, callback);
        },

        /**
        * Get the balance data
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        balance: function(callback) {
            signedRequest(base+'v3/account', {}, function(error, data) {
                if ( callback ) callback( error, balanceData(data) );
            });
        },

        /**
        * Get trades for a given symbol
        * @param {string} symbol - the symbol
        * @param {function} callback - the callback function
        * @param {object} options - addtional optoins
        * @return {undefined}
        */
        trades: function(symbol, callback, options = {}) {
            let parameters = Object.assign({symbol:symbol}, options);
            signedRequest(base+'v3/myTrades', parameters, function(error, data) {
                if ( callback ) return callback.call(this, error, data, symbol);
            });
        },

        /**
        * Tell api to iuse the server time to offset time indexes
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        useServerTime: function(callback = false) {
            apiRequest(base+'v1/time', function(error, response) {
                info.timeOffset = response.serverTime - new Date().getTime();
                //options.log("server time set: ", response.serverTime, info.timeOffset);
                if ( callback ) callback();
            });
        },

        /**
        * Gets the time
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        time: function(callback) {
            apiRequest(base+'v1/time', callback);
        },

        /**
        * Get agg trads for given symbol
        * @param {string} symbol - the symbol
        * @param {object} options - addtional optoins
        * @param {function} callback - the callback function
        * @return {undefined}
        */
        aggTrades: function(symbol, options = {}, callback = false) { //fromId startTime endTime limit
            let parameters = Object.assign({symbol}, options);
            marketRequest(base+'v1/aggTrades', parameters, callback);
        },

        /**
        * Get the recent trades
        * @param {string} symbol - the symbol
        * @param {function} callback - the callback function
        * @param {int} limit - limit the number of items returned
        * @return {undefined}
        */
        recentTrades: function(symbol, callback, limit = 500) {
            marketRequest(base+'v1/trades', {symbol:symbol, limit:limit}, callback);
        },

        /**
        * Get the historical trade info
        * @param {string} symbol - the symbol
        * @param {function} callback - the callback function
        * @param {int} limit - limit the number of items returned
        * @param {int} fromId - from this id
        * @return {undefined}
        */
        historicalTrades: function(symbol, callback, limit = 500, fromId = false) {
            let parameters = {symbol:symbol, limit:limit};
            if ( fromId ) parameters.fromId = fromId;
            marketRequest(base+'v1/historicalTrades', parameters, callback);
        },

        /**
        * convert chart data to highstock array [timestamp,open,high,low,close]
        * @param {object} chart - the chart
        * @param {boolean} include_volume - to include the voume or not
        * @return {array} - an array
        */
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

        /**
        * Populates hte ohlc infomration
        * @param {object} chart - the chart
        * @return {object} - object with cnalde information
        */
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

        /**
        * gets the candles information for a given symbol
        * intervals: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
        * @param {string} symbol - the symbol
        * @param {function} interval - the callback function
        * @param {function} callback - the callback function
        * @param {object} options - addtitional options
        * @return {undefined}
        */
        candlesticks: function(symbol, interval = '5m', callback = false, options = {limit:500}) {
            if ( !callback ) return;
            let params = Object.assign({symbol:symbol, interval:interval}, options);
            publicRequest(base+'v1/klines', params, function(error, data) {
                return callback.call(this, error, data, symbol);
            });
        },

        /**
        * Queries the public api
        * @param {string} url - the public api endpoint
        * @param {object} data - the data to send
        * @param {function} callback - the callback function
        * @param {string} method - the http method
        * @return {undefined}
        */
        publicRequest: function(url, data, callback, method = 'GET') {
            publicRequest(url, data, callback, method)
        },

        /**
        * Queries the signed api
        * @param {string} url - the signed api endpoint
        * @param {object} data - the data to send
        * @param {function} callback - the callback function
        * @param {string} method - the http method
        * @return {undefined}
        */
        signedRequest: function(url, data, callback, method = 'GET') {
            signedRequest(url, data, callback, method);
        },

        /**
        * gets the market asset of given symbol
        * @param {string} symbol - the public api endpoint
        * @return {undefined}
        */
        getMarket: function(symbol) {
            const substring = symbol.substr(-3);
            if ( substring === 'BTC' ) return 'BTC';
            else if ( substring === 'ETH' ) return 'ETH';
            else if ( substring === 'BNB' ) return 'BNB';
            else if ( symbol.substr(-4) === 'USDT' ) return 'USDT';
        },
        websockets: {
            userData: function userData(callback, execution_callback = false, subscribed_callback = false) {
                let reconnect = function() {
                    if ( options.reconnect ) userData(callback, execution_callback, subscribed_callback);
                };
                apiRequest(base+'v1/userDataStream', function(error, response) {
                    options.listenKey = response.listenKey;
                    setTimeout(function userDataKeepAlive() { // keepalive
                        try {
                            apiRequest(base+'v1/userDataStream?listenKey='+options.listenKey, function(err) {
                                if ( err ) setTimeout(userDataKeepAlive, 60000); // retry in 1 minute
                                else setTimeout(userDataKeepAlive, 60 * 30 * 1000); // 30 minute keepalive
                            }, 'PUT');
                        } catch ( error ) {
                            setTimeout(userDataKeepAlive, 60000); // retry in 1 minute
                        }
                    }, 60 * 30 * 1000); // 30 minute keepalive
                    options.balance_callback = callback;
                    options.execution_callback = execution_callback;
                    const subscription = subscribe(options.listenKey, userDataHandler, reconnect);
                    if ( subscribed_callback ) subscribed_callback(subscription.endpoint);
                }, 'POST');
            },
            subscribe: function(url, callback, reconnect = false) {
                return subscribe(url, callback, reconnect);
            },
            subscribeCombined: function(url, callback, reconnect = false) {
                return subscribeCombined(url, callback, reconnect);
            },
            subscriptions: function() {
                return subscriptions;
            },
            terminate: function(endpoint) {
                let ws = subscriptions[endpoint];
                if ( !ws ) return;
                options.log('WebSocket terminated:', endpoint);
                ws.reconnect = false;
                ws.terminate();
            },
            depth: function depth(symbols, callback) {
                let reconnect = function() {
                    if ( options.reconnect ) depth(symbols, callback);
                };

                let subscription;
                if ( Array.isArray(symbols) ) {
                    if ( !isArrayUnique(symbols) ) throw Error('depth: "symbols" cannot contain duplicate elements.');
                    let streams = symbols.map(function(symbol) {
                        return symbol.toLowerCase()+'@depth';
                    });
                    subscription = subscribeCombined(streams, callback, reconnect);
                } else {
                    let symbol = symbols;
                    subscription = subscribe(symbol.toLowerCase()+'@depth', callback, reconnect);
                }
                return subscription.endpoint;
            },
            depthCache: function depthCacheFunction(symbols, callback, limit = 500) {
                let reconnect = function() {
                    if ( options.reconnect ) depthCacheFunction(symbols, callback, limit);
                };

                let symbolDepthInit = function(symbol) {
                    if ( typeof depthCacheContext[symbol] === 'undefined' ) depthCacheContext[symbol] = {};

                    let context = depthCacheContext[symbol];
                    context.snapshotUpdateId = null;
                    context.lastEventUpdateId = null;
                    context.messageQueue = [];

                    depthCache[symbol] = { bids: {}, asks: {} };
                };

                let handleDepthStreamData = function(depth) {
                    let symbol = depth.s;
                    let context = depthCacheContext[symbol];
                    if (context.messageQueue && !context.snapshotUpdateId ) {
                        context.messageQueue.push(depth);
                    } else {
                        try {
                            depthHandler(depth);
                            if ( callback ) callback(symbol, depthCache[symbol]);
                        } catch (err) {
                            reconnect();
                        }
                    }
                };

                let getSymbolDepthSnapshot = function(symbol) {
                    publicRequest(base+'v1/depth', { symbol:symbol, limit:limit }, function(error, json) {
                        // Initialize depth cache from snapshot
                        depthCache[symbol] = depthData(json);
                        // Prepare depth cache context
                        let context = depthCacheContext[symbol];
                        context.snapshotUpdateId = json.lastUpdateId;
                        context.messageQueue = context.messageQueue.filter(depth => depth.u > context.snapshotUpdateId);
                        // Process any pending depth messages
                        for ( let depth of context.messageQueue ) {

                            /* Although sync errors shouldn't ever happen here, we catch and swallow them anyway
                               just in case. The stream handler function above will deal with broken caches. */
                            try {depthHandler(depth);} catch (err) {
                                // do nothing
                            }
                        }
                        delete context.messageQueue;
                        if ( callback ) callback(symbol, depthCache[symbol]);
                    });
                };

                /* If an array of symbols are sent we use a combined stream connection rather.
                   This is transparent to the developer, and results in a single socket connection.
                   This essentially eliminates "unexpected response" errors when subscribing to a lot of data. */
                let subscription;
                if ( Array.isArray(symbols) ) {
                    if ( !isArrayUnique(symbols) ) throw Error('depthCache: "symbols" cannot contain duplicate elements.');

                    symbols.forEach(symbolDepthInit);
                    let streams = symbols.map(function (symbol) {
                        return symbol.toLowerCase()+'@depth';
                    });
                    subscription = subscribeCombined(streams, handleDepthStreamData, reconnect, function() {
                        symbols.forEach(getSymbolDepthSnapshot);
                    });
                } else {
                    let symbol = symbols;
                    symbolDepthInit(symbol);
                    subscription = subscribe(symbol.toLowerCase()+'@depth', handleDepthStreamData, reconnect, function() {
                        getSymbolDepthSnapshot(symbol);
                    });
                }
                return subscription.endpoint;
            },
            trades: function trades(symbols, callback) {
                let reconnect = function() {
                    if ( options.reconnect ) trades(symbols, callback);
                };

                let subscription;
                if ( Array.isArray(symbols) ) {
                    if ( !isArrayUnique(symbols) ) throw Error('trades: "symbols" cannot contain duplicate elements.');
                    let streams = symbols.map(function(symbol) {
                        return symbol.toLowerCase()+'@aggTrade';
                    });
                    subscription = subscribeCombined(streams, callback, reconnect);
                } else {
                    let symbol = symbols;
                    subscription = subscribe(symbol.toLowerCase()+'@aggTrade', callback, reconnect);
                }
                return subscription.endpoint;
            },
            chart: function chart(symbols, interval, callback) {
                let reconnect = function() {
                    if ( options.reconnect ) chart(symbols, interval, callback);
                };

                let symbolChartInit = function(symbol) {
                    if ( typeof info[symbol] === 'undefined' ) info[symbol] = {};
                    if ( typeof info[symbol][interval] === 'undefined' ) info[symbol][interval] = {};
                    if ( typeof ohlc[symbol] === 'undefined' ) ohlc[symbol] = {};
                    if ( typeof ohlc[symbol][interval] === 'undefined' ) ohlc[symbol][interval] = {};
                    if ( typeof ohlcLatest[symbol] === 'undefined' ) ohlcLatest[symbol] = {};
                    if ( typeof ohlcLatest[symbol][interval] === 'undefined' ) ohlcLatest[symbol][interval] = {};
                    if ( typeof klineQueue[symbol] === 'undefined' ) klineQueue[symbol] = {};
                    if ( typeof klineQueue[symbol][interval] === 'undefined' ) klineQueue[symbol][interval] = [];
                    info[symbol][interval].timestamp = 0;
                }

                let handleKlineStreamData = function(kline) {
                    let symbol = kline.s;
                    if ( !info[symbol][interval].timestamp ) {
                      if ( typeof (klineQueue[symbol][interval]) !== 'undefined' && kline !== null) {
                        klineQueue[symbol][interval].push(kline);
                      }
                    } else {
                        //options.log('@klines at ' + kline.k.t);
                        klineHandler(symbol, kline);
                        if ( callback ) callback(symbol, interval, klineConcat(symbol, interval));
                    }
                };

                let getSymbolKlineSnapshot = function(symbol) {
                    publicRequest(base + 'v1/klines', { symbol:symbol, interval:interval }, function (error, data) {
                        klineData(symbol, interval, data);
                        //options.log('/klines at ' + info[symbol][interval].timestamp);
                        if ( typeof klineQueue[symbol][interval] !== 'undefined' ) {
                            for ( let kline of klineQueue[symbol][interval] ) klineHandler(symbol, kline, info[symbol][interval].timestamp);
                            delete klineQueue[symbol][interval];
                        }
                        if ( callback ) callback(symbol, interval, klineConcat(symbol, interval));
                    });
                };

                let subscription;
                if ( Array.isArray(symbols) ) {
                    if ( !isArrayUnique(symbols) ) throw Error('chart: "symbols" cannot contain duplicate elements.');
                    symbols.forEach(symbolChartInit);
                    let streams = symbols.map(function(symbol) {
                        return symbol.toLowerCase()+'@kline_'+interval;
                    });
                    subscription = subscribeCombined(streams, handleKlineStreamData, reconnect);
                    symbols.forEach(getSymbolKlineSnapshot);
                } else {
                    let symbol = symbols;
                    symbolChartInit(symbol);
                    subscription = subscribe(symbol.toLowerCase()+'@kline_'+interval, handleKlineStreamData, reconnect);
                    getSymbolKlineSnapshot(symbol);
                }
                return subscription.endpoint;
            },
            candlesticks: function candlesticks(symbols, interval, callback) {
                let reconnect = function() {
                    if ( options.reconnect ) candlesticks(symbols, interval, callback);
                };

                /* If an array of symbols are sent we use a combined stream connection rather.
                   This is transparent to the developer, and results in a single socket connection.
                   This essentially eliminates "unexpected response" errors when subscribing to a lot of data. */
                let subscription;
                if ( Array.isArray(symbols) ) {
                    if ( !isArrayUnique(symbols) ) throw Error('candlesticks: "symbols" cannot contain duplicate elements.');
                    let streams = symbols.map(function (symbol) {
                        return symbol.toLowerCase()+'@kline_'+interval;
                    });
                    subscription = subscribeCombined(streams, callback, reconnect);
                } else {
                    let symbol = symbols.toLowerCase();
                    subscription = subscribe(symbol+'@kline_'+interval, callback, reconnect);
                }
                return subscription.endpoint;
            },
            miniTicker: function miniTicker(callback) {
                let reconnect = function() {
                    if ( options.reconnect ) miniTicker(callback);
                };
                let subscription = subscribe('!miniTicker@arr', function(data) {
                    let markets = {};
                    for ( let obj of data ) {
                        markets[obj.s] = {
                            close: obj.c,
                            open: obj.o,
                            high: obj.h,
                            low: obj.l,
                            volume: obj.v,
                            quoteVolume: obj.q,
                            eventTime: obj.E
                        };
                    }
                    callback(markets);
                }, reconnect);
                return subscription.endpoint;
            },
            prevDay: function prevDay(symbols, callback) {
                let reconnect = function() {
                    if ( options.reconnect ) prevDay(symbols, callback);
                };

                let subscription;
                // Combine stream for array of symbols
                if ( Array.isArray(symbols) ) {
                    if ( !isArrayUnique(symbols) ) throw Error('prevDay: "symbols" cannot contain duplicate elements.');
                    let streams = symbols.map(function(symbol) {
                        return symbol.toLowerCase()+'@ticker';
                    });
                    subscription = subscribeCombined(streams, function(data) {
                        prevDayStreamHandler(data, callback);
                    }, reconnect);
                // Raw stream for  a single symbol
                } else if ( symbols ) {
                    let symbol = symbols;
                    subscription = subscribe(symbol.toLowerCase()+'@ticker', function(data) {
                        prevDayStreamHandler(data, callback);
                    }, reconnect);
                // Raw stream of all listed symbols
                } else {
                    subscription = subscribe('!ticker@arr', function(data) {
                        for ( let line of data ) {
                            prevDayStreamHandler(line, callback);
                        }
                    }, reconnect);
                }
                return subscription.endpoint;
            }
        }
    };
}();
//https://github.com/binance-exchange/binance-official-api-docs
