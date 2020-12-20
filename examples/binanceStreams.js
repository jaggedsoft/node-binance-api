// Work in progress, browser compatible port of the library. Uses built-in websocket which is different from node's implementation. Untested
//TODO: Add auto-reconnect
let base = 'https://api.binance.com/api/';
let wapi = 'https://api.binance.com/wapi/';
let sapi = 'https://api.binance.com/sapi/';
let fapi = 'https://fapi.binance.com/fapi/';
let fapiTest = 'https://testnet.binancefuture.com/fapi/';
let stream = 'wss://stream.binance.com:9443/ws/';
let fstreamSingle = 'wss://fstream.binance.com/ws/';
let fstream = 'wss://fstream.binance.com/stream?streams=';
let combineStream = 'wss://stream.binance.com:9443/stream?streams=';
// let base = 'https://api.binance.com/api/';
// let wapi = 'https://api.binance.com/wapi/';
// let sapi = 'https://api.binance.com/sapi/';
// let fapi = 'https://fapi.binance.com/fapi/';
// let fapiTest = 'https://testnet.binancefuture.com/fapi/';
// let fstream = 'wss://fstream.binance.com/stream?streams=';
// let fstreamSingle = 'wss://fstream.binance.com/ws/';
// let stream = 'wss://stream.binance.com:9443/ws/';
// let combineStream = 'wss://stream.binance.com:9443/stream?streams=';
const contentType = 'x-www-form-urlencoded';
let subscriptions = {}, futuresSubscriptions = {};
let futuresTicks = {}, futuresMeta = {}, futuresRealtime = {}, futuresKlineQueue = {};
let depthCache = {}, depthCacheContext = {}, ohlcLatest = {}, klineQueue = {}, ohlc = {};
const default_options = {
    recvWindow: 5000,
    useServerTime: false,
    reconnect: true,
    verbose: true,
    log: console.log
};
let options = default_options;
let info = { timeOffset: 0 };
let socketHeartbeatInterval = null;
if ( options ) setOptions( options );

function setOptions( opt = {}, callback = false ) {
    if ( typeof opt === 'string' ) { // Pass json config filename
        options = JSON.parse( file.readFileSync( opt ) );
    } else options = opt;
    if ( typeof options.recvWindow === 'undefined' ) options.recvWindow = default_options.recvWindow;
    if ( typeof options.useServerTime === 'undefined' ) options.useServerTime = default_options.useServerTime;
    if ( typeof options.reconnect === 'undefined' ) options.reconnect = default_options.reconnect;
    if ( typeof options.test === 'undefined' ) options.test = default_options.test;
    if ( typeof options.log === 'undefined' ) options.log = default_options.log;
    if ( typeof options.verbose === 'undefined' ) options.verbose = default_options.verbose;
    if ( typeof options.urls !== 'undefined' ) {
        const { urls } = options;
        if ( typeof urls.base === 'string' ) base = urls.base;
        if ( typeof urls.wapi === 'string' ) wapi = urls.wapi;
        if ( typeof urls.sapi === 'string' ) sapi = urls.sapi;
        if ( typeof urls.fapi === 'string' ) fapi = urls.fapi;
        if ( typeof urls.fapiTest === 'string' ) fapiTest = urls.fapiTest;
        if ( typeof urls.stream === 'string' ) stream = urls.stream;
        if ( typeof urls.combineStream === 'string' ) combineStream = urls.combineStream;
        if ( typeof urls.fstream === 'string' ) fstream = urls.fstream;
        if ( typeof urls.fstreamSingle === 'string' ) fstreamSingle = urls.fstreamSingle;
    }
    if ( options.useServerTime ) {
        apiRequest( base + 'v3/time', {}, function ( response ) {
            info.timeOffset = response.serverTime - new Date().getTime();
            //options.log("server time set: ", response.serverTime, info.timeOffset);
            if ( callback ) callback();
        } );
    } else if ( callback ) callback();
}

function request( url, params = {}, callback = false, opt = {} ) {
    let hasParams = Object.keys( params ).length;
    if ( !url ) url = opt.url;
    if ( !hasParams && opt.qs ) {
        params = opt.qs;
        hasParams = Object.keys( params ).length;
    }
    if ( hasParams ) url = `${ url }?${ new URLSearchParams( params ).toString() }`;
    if ( !url ) throw `axios error: ${ url }`;
    if ( options.verbose ) console.info( 'request', url, params, opt );
    //opt.url = url;
    opt.method = !opt.method ? 'get' : opt.method;
    opt.baseURL = !opt.baseURL ? base : opt.baseURL;
    axios( url, opt ).then( function ( response ) {
        if ( callback ) callback( response.data );
    } ).catch( function ( error ) {
        if ( error.response ) console.warn( error.response.data );
        throw error.message;
    } );
}

/**
 * Checks to see of the object is iterable
 * @param {object} obj - The object check
 * @return {boolean} true or false is iterable
 */
const isIterable = obj => {
    if ( !obj ) return false;
    return Symbol.iterator in Object( obj );
    //return typeof obj[Symbol.iterator] === 'function';
}

// if ( Object.keys( params ).length ) url = `${ url }?${ new URLSearchParams( params ).toString() }`;
const reqObj = ( url, data = {}, method = 'GET', key ) => ( {
    url: url,
    json: data, //qs
    method,
    timeout: options.recvWindow,
    headers: {
        'Content-type': contentType,
        'X-MBX-APIKEY': key || ''
    }
} )

const reqObjPOST = ( url, data = {}, method = 'POST', key ) => ( {
    url: url,
    json: data, //form: data,
    method,
    timeout: options.recvWindow,
    headers: {
        'Content-type': contentType,
        'X-MBX-APIKEY': key || ''
    }
} )

/**
* Create a http request to the public API
* @param {string} url - The http endpoint
* @param {object} data - The data to send
* @param {function} callback - The callback method to call
* @param {string} method - the http method
* @return {undefined}
 */
const publicRequest = ( url, data = {}, callback, method = 'GET' ) => {
    if ( Object.keys( data ).length ) url = `${ url }?${ new URLSearchParams( data ).toString() }`;
    if ( options.verbose ) console.info( `publicRequest`, url, data, method );
    let opt = reqObj( url, data, method );
    request( opt, {}, callback );
};

const makeQueryString = q => Object.keys( q ).reduce( ( a, k ) => { if ( q[k] !== undefined ) { a.push( k + '=' + encodeURIComponent( q[k] ) ) } return a }, [] ).join( '&' );

/**
 * Create a http request to the public API
 * @param {string} url - The http endpoint
 * @param {object} data - The data to send
 * @param {function} callback - The callback method to call
 * @param {string} method - the http method
 * @return {undefined}
 */
const apiRequest = ( url, data = {}, callback, method = 'GET' ) => {
    if ( Object.keys( data ).length ) url = `${ url }?${ new URLSearchParams( data ).toString() }`;
    if ( options.verbose ) console.info( `apiRequest`, url, data, method );
    if ( !options.APIKEY ) throw Error( 'apiRequest: Invalid API Key' );
    let opt = reqObj(
        url,
        data,
        method,
        options.APIKEY
    );
    request( opt, {}, callback );
};

const promiseRequest = async ( url, data = {}, flags = {} ) => {
    //if ( Object.keys( params ).length ) url = `${ url }?${ new URLSearchParams( params ).toString() }`;
    if ( options.verbose ) console.info( `promiseRequest`, url, data, flags );
    return new Promise( ( resolve, reject ) => {
        let query = '', headers = {
            'Content-type': 'application/x-www-form-urlencoded'
        };
        if ( typeof flags.method === 'undefined' ) flags.method = 'GET'; // GET POST PUT DELETE
        if ( typeof flags.type === 'undefined' ) flags.type = false; // TRADE, SIGNED, MARKET_DATA, USER_DATA, USER_STREAM
        else {
            if ( typeof data.recvWindow === 'undefined' ) data.recvWindow = options.recvWindow;
            headers['X-MBX-APIKEY'] = options.APIKEY;
            if ( !options.APIKEY ) return reject( 'Invalid API Key' );
        }
        let baseURL = typeof flags.base === 'undefined' ? base : flags.base;
        if ( options.test && baseURL === fapi ) baseURL = fapiTest;
        let opt = {
            headers,
            url: baseURL + url,
            method: flags.method,
            timeout: options.recvWindow,
            followAllRedirects: true
        };
        if ( flags.type === 'SIGNED' || flags.type === 'TRADE' || flags.type === 'USER_DATA' ) {
            if ( !options.APISECRET ) return reject( 'Invalid API Secret' );
            data.timestamp = new Date().getTime() + info.timeOffset;
            query = makeQueryString( data );
            data.signature = crypto.createHmac( 'sha256', options.APISECRET ).update( query ).digest( 'hex' ); // HMAC hash header
            opt.url = `${ baseURL }${ url }?${ query }&signature=${ data.signature }`;
        }
        opt.qs = data;
        try {
            request( false, {}, ( data ) => { //response
                //if ( error ) return reject( error );
                try {
                    return resolve ( data )
                    //return resolve ( response.data );
                    /*if ( !error && response.statusCode == 200 ) return resolve( response.data );
                    if ( typeof error.response.status !== 'undefined' ) {
                        return resolve( response.json() );
                    }*/
                    //return reject( response.data );
                } catch ( err ) {
                    return reject( `promiseRequest error #${ response.statusCode }` );
                }
            }, opt );
        } catch ( err ) {
            return reject( err );
        }
    } );
};


const MD5 = new Hashes.MD5, openState = 1;
const socketHeartbeat = () => {
    return;
    for ( let endpointId in subscriptions ) {
        const ws = subscriptions[endpointId];
        if ( ws.isAlive ) {
            ws.isAlive = false;
            // TODO: Fix heartbeat. Browser client can't send pings
            // if ( ws.readyState === openState ) ws.send( '{"ping": true}' );
        } else {
            if ( options.verbose ) options.log( 'Terminating inactive/broken WebSocket: ' + ws.endpoint );
            if ( ws.readyState === openState ) ws.close();
        }
    }
};

/**
* Called when socket is opened, subscriptions are registered for later reference
* @param {function} opened_callback - a callback function
* @return {undefined}
 */
const handleSocketOpen = function ( opened_callback ) {
    this.isAlive = true;
    if ( Object.keys( subscriptions ).length === 0 ) {
        socketHeartbeatInterval = setInterval( socketHeartbeat, 30000 );
    }
    subscriptions[this.endpoint] = this;
    if ( typeof opened_callback === 'function' ) opened_callback( this.endpoint );
};

/**
* Called when socket is closed, subscriptions are de-registered for later reference
* @param {boolean} reconnect - true or false to reconnect the socket
* @param {string} code - code associated with the socket
* @param {string} reason - string with the response
* @return {undefined}
 */
const handleSocketClose = function ( reconnect, code, reason ) {
    delete subscriptions[this.endpoint];
    if ( subscriptions && Object.keys( subscriptions ).length === 0 ) {
        clearInterval( socketHeartbeatInterval );
    }
    options.log( 'WebSocket closed: ' + this.endpoint +
          ( code ? ' (' + code + ')' : '' ) +
          ( reason ? ' ' + reason : '' ) );
    if ( options.reconnect && this.reconnect && reconnect ) {
        if ( this.endpoint && parseInt( this.endpoint.length, 10 ) === 60 ) options.log( 'Account data WebSocket reconnecting...' );
        else options.log( 'WebSocket reconnecting: ' + this.endpoint + '...' );
        try {
            reconnect();
        } catch ( error ) {
            options.log( 'WebSocket reconnect error: ' + error.message );
        }
    }
};

/**
* Called when socket errors
* @param {object} error - error object message
* @return {undefined}
 */
const handleSocketError = function ( error ) {
    /* Errors ultimately result in a `close` event.
         see: https://github.com/websockets/ws/blob/828194044bf247af852b31c49e2800d557fedeff/lib/WebSocket.js#L126 */
    options.log( 'WebSocket error: ' + this.endpoint +
          ( error.code ? ' (' + error.code + ')' : '' ) +
          ( error.message ? ' ' + error.message : '' ) );
};

/**
* Called on each socket heartbeat
* @return {undefined}
 */
const handleSocketHeartbeat = function () {
    this.isAlive = true;
};

/**
 * Used to subscribe to a single websocket endpoint
 * @param {string} endpoint - endpoint to connect to
 * @param {function} callback - the function to call when information is received
 * @param {boolean} reconnect - whether to reconnect on disconnect
 * @param {object} opened_callback - the function to call when opened
 * @return {WebSocket} - websocket reference
 */
const subscribe = function ( endpoint, callback, reconnect = false, opened_callback = false ) {
    let ws = new WebSocket( stream + endpoint );
    if ( options.verbose ) options.log( 'Subscribed to ' + endpoint );
    ws.reconnect = options.reconnect;
    ws.endpoint = endpoint;
    ws.isAlive = false;
    ws.onopen = handleSocketOpen.bind( ws, opened_callback );
    ws.onping = handleSocketHeartbeat;
    ws.onerror = handleSocketError;
    ws.onclose = handleSocketClose.bind( ws, reconnect );
    ws.onmessage = event => {
        //try {
        callback( JSON.parse( event.data ) );
        //} catch ( error ) {
        //    options.log( 'Parse error: ' + error.message );
        //}
    };
    return ws;
};

/**
 * Used to subscribe to a combined websocket endpoint
 * @param {string} streams - streams to connect to
 * @param {function} callback - the function to call when information is received
 * @param {boolean} reconnect - whether to reconnect on disconnect
 * @param {object} opened_callback - the function to call when opened
 * @return {WebSocket} - websocket reference
 */
const subscribeCombined = function ( streams, callback, reconnect = false, opened_callback = false ) {
    let queryParams = streams.join( '/' ), ws = new WebSocket( combineStream + queryParams );
    ws.reconnect = options.reconnect;
    ws.endpoint = MD5.hex( queryParams );
    ws.isAlive = false;
    if ( options.verbose ) options.log( 'CombinedStream: Subscribed to [' + ws.endpoint + '] ' + queryParams );
    ws.onopen = handleSocketOpen.bind( ws, opened_callback );
    ws.onping = handleSocketHeartbeat;
    ws.onerror = handleSocketError;
    ws.onclose = handleSocketClose.bind( ws, reconnect );
    ws.onmessage = event => {
        try {
            callback( JSON.parse( event.data ).data );
        } catch ( error ) {
            options.log( 'CombinedStream: Parse error: ' + error.message );
        }
    };
    return ws;
};

/**
 * Used to terminate a web socket
 * @param {string} endpoint - endpoint identifier associated with the web socket
 * @param {boolean} reconnect - auto reconnect after termination
 * @return {undefined}
 */
const terminate = function ( endpoint, reconnect = false ) {
    let ws = subscriptions[endpoint];
    if ( !ws ) return;
    ws.removeAllListeners( 'message' );
    ws.reconnect = reconnect;
    ws.close();
}


/**
* Futures heartbeat code with a shared single interval tick
 * @return {undefined}
 */
const futuresSocketHeartbeat = () => {
    return;
    /* Sockets removed from subscriptions during a manual terminate()
         will no longer be at risk of having functions called on them */
    for ( let endpointId in futuresSubscriptions ) {
        const ws = futuresSubscriptions[endpointId];
        if ( ws.isAlive ) {
            ws.isAlive = false;
            // TODO: Fix heartbeat. Browser client can't send pings
            //if ( ws.readyState === openState ) ws.send( '{"ping": true}' );
        } else {
            if ( options.verbose ) options.log( `Terminating zombie futures WebSocket: ${ ws.endpoint }` );
            if ( ws.readyState === openState ) ws.close();
        }
    }
};

/**
 * Called when a futures socket is opened, subscriptions are registered for later reference
 * @param {function} openCallback - a callback function
 * @return {undefined}
 */
const handleFuturesSocketOpen = function ( openCallback ) {
    this.isAlive = true;
    if ( Object.keys( futuresSubscriptions ).length === 0 ) {
        socketHeartbeatInterval = setInterval( futuresSocketHeartbeat, 30000 );
    }
    futuresSubscriptions[this.endpoint] = this;
    if ( typeof openCallback === 'function' ) openCallback( this.endpoint );
};

/**
 * Called when futures websocket is closed, subscriptions are de-registered for later reference
 * @param {boolean} reconnect - true or false to reconnect the socket
 * @param {string} code - code associated with the socket
 * @param {string} reason - string with the response
 * @return {undefined}
 */
const handleFuturesSocketClose = function ( reconnect, code, reason ) {
    delete futuresSubscriptions[this.endpoint];
    if ( futuresSubscriptions && Object.keys( futuresSubscriptions ).length === 0 ) {
        clearInterval( socketHeartbeatInterval );
    }
    options.log( 'Futures WebSocket closed: ' + this.endpoint +
          ( code ? ' (' + code + ')' : '' ) +
          ( reason ? ' ' + reason : '' ) );
    if ( options.reconnect && this.reconnect && reconnect ) {
        if ( this.endpoint && parseInt( this.endpoint.length, 10 ) === 60 ) options.log( 'Futures account data WebSocket reconnecting...' );
        else options.log( 'Futures WebSocket reconnecting: ' + this.endpoint + '...' );
        try {
            reconnect();
        } catch ( error ) {
            options.log( 'Futures WebSocket reconnect error: ' + error.message );
        }
    }
};

/**
 * Called when a futures websocket errors
 * @param {object} error - error object message
 * @return {undefined}
 */
const handleFuturesSocketError = function ( error ) {
    options.log( 'Futures WebSocket error: ' + this.endpoint +
          ( error.code ? ' (' + error.code + ')' : '' ) +
          ( error.message ? ' ' + error.message : '' ) );
};

/**
 * Called on each futures socket heartbeat
 * @return {undefined}
 */
const handleFuturesSocketHeartbeat = function () {
    this.isAlive = true;
};

/**
 * Used to subscribe to a single futures websocket endpoint
 * @param {string} endpoint - endpoint to connect to
 * @param {function} callback - the function to call when information is received
 * @param {object} params - Optional reconnect {boolean} (whether to reconnect on disconnect), openCallback {function}, id {string}
 * @return {WebSocket} - websocket reference
 */
const futuresSubscribeSingle = function ( endpoint, callback, params = {} ) {
    if ( typeof params === 'boolean' ) params = { reconnect: params };
    if ( !params.reconnect ) params.reconnect = false;
    if ( !params.openCallback ) params.openCallback = false;
    if ( !params.id ) params.id = false;
    let ws = new WebSocket( fstreamSingle + endpoint );

    if ( options.verbose ) options.log( 'futuresSubscribeSingle: Subscribed to ' + endpoint );
    ws.reconnect = options.reconnect;
    ws.endpoint = endpoint;
    ws.isAlive = false;
    ws.onopen = handleFuturesSocketOpen.bind( ws, params.openCallback );
    ws.onping = handleFuturesSocketHeartbeat;
    ws.onerror = handleFuturesSocketError;
    ws.onclose = handleFuturesSocketClose.bind( ws, params.reconnect );
    ws.onmessage = event => {
        callback( JSON.parse( event.data ) );
    };
    return ws;
};

/**
 * Used to subscribe to a combined futures websocket endpoint
 * @param {string} streams - streams to connect to
 * @param {function} callback - the function to call when information is received
 * @param {object} params - Optional reconnect {boolean} (whether to reconnect on disconnect), openCallback {function}, id {string}
 * @return {WebSocket} - websocket reference
 */
const futuresSubscribe = function ( streams, callback, params = {} ) {
    if ( typeof streams === 'string' ) return futuresSubscribeSingle( streams, callback, params );
    if ( typeof params === 'boolean' ) params = { reconnect: params };
    if ( !params.reconnect ) params.reconnect = false;
    if ( !params.openCallback ) params.openCallback = false;
    if ( !params.id ) params.id = false;
    const queryParams = streams.join( '/' );
    let ws = new WebSocket( fstream + queryParams );
    ws.reconnect = options.reconnect;
    ws.endpoint = MD5.hex( queryParams );
    ws.isAlive = false;
    if ( options.verbose ) options.log( `futuresSubscribe: Subscribed to [${ ws.endpoint }] ${ queryParams }` );
    ws.onopen = handleFuturesSocketOpen.bind( ws, params.openCallback );
    ws.onping = handleFuturesSocketHeartbeat;
    ws.onerror = handleFuturesSocketError;
    ws.onclose = handleFuturesSocketClose.bind( ws, params.reconnect );
    ws.onmessage = event => {
        try {
            callback( JSON.parse( event.data ).data );
        } catch ( error ) {
            options.log( `futuresSubscribe: Parse error: ${ error.message }` );
        }
    };
    return ws;
};

/**
 * Used to terminate a futures websocket
 * @param {string} endpoint - endpoint identifier associated with the web socket
 * @param {boolean} reconnect - auto reconnect after termination
 * @return {undefined}
 */
const futuresTerminate = function ( endpoint, reconnect = false ) {
    let ws = futuresSubscriptions[endpoint];
    if ( !ws ) return;
    ws.removeAllListeners( 'message' );
    ws.reconnect = reconnect;
    ws.close();
}

/**
 * Combines all futures OHLC data with the latest update
 * @param {string} symbol - the symbol
 * @param {string} interval - time interval
 * @return {array} interval data for given symbol
 */
const futuresKlineConcat = ( symbol, interval ) => {
    let output = futuresTicks[symbol][interval];
    if ( typeof futuresRealtime[symbol][interval].time === 'undefined' ) return output;
    const time = futuresRealtime[symbol][interval].time;
    const last_updated = Object.keys( futuresTicks[symbol][interval] ).pop();
    if ( time >= last_updated ) {
        output[time] = futuresRealtime[symbol][interval];
        output[last_updated].isFinal = true;
        output[time].isFinal = false;
    }
    return output;
};

/**
 * Used for websocket futures @kline
 * @param {string} symbol - the symbol
 * @param {object} kline - object with kline info
 * @param {string} firstTime - time filter
 * @return {undefined}
 */
const futuresKlineHandler = ( symbol, kline, firstTime = 0 ) => {
    // eslint-disable-next-line no-unused-vars
    let { e: eventType, E: eventTime, k: ticks } = kline;
    // eslint-disable-next-line no-unused-vars
    let { o: open, h: high, l: low, c: close, v: volume, i: interval, x: isFinal, q: quoteVolume, V: takerBuyBaseVolume, Q: takerBuyQuoteVolume, n: trades, t: time, T:closeTime } = ticks;
    if ( time <= firstTime ) return;
    if ( !isFinal ) return futuresRealtime[symbol][interval] = { time, closeTime, open, high, low, close, volume, quoteVolume, takerBuyBaseVolume, takerBuyQuoteVolume, trades, isFinal };
    const first_updated = Object.keys( futuresTicks[symbol][interval] ).shift();
    if ( first_updated ) delete futuresTicks[symbol][interval][first_updated];
    futuresTicks[symbol][interval][time] = { time, closeTime, open, high, low, close, volume, quoteVolume, takerBuyBaseVolume, takerBuyQuoteVolume, trades, isFinal:false };
};

/**
 * Used by web sockets depth and populates OHLC and info
 * @param {string} symbol - symbol to get candlestick info
 * @param {string} interval - time interval, 1m, 3m, 5m ....
 * @param {array} ticks - tick array
 * @return {undefined}
 */
const klineData = ( symbol, interval, ticks ) => { // Used for /depth
    let last_time = 0;
    if ( isIterable( ticks ) ) {
        for ( let tick of ticks ) {
            // eslint-disable-next-line no-unused-vars
            let [ time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored ] = tick;
            ohlc[symbol][interval][time] = { open: Number( open ), high: Number( high ), low: Number( low ), close: Number( close ), volume: Number( volume ), time: parseInt( time ) };
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
const klineConcat = ( symbol, interval ) => {
    let output = ohlc[symbol][interval];
    if ( typeof ohlcLatest[symbol][interval].time === 'undefined' ) return output;
    const time = ohlcLatest[symbol][interval].time;
    const last_updated = Object.keys( ohlc[symbol][interval] ).pop();
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
const klineHandler = ( symbol, kline, firstTime = 0 ) => {
    // TODO: add Taker buy base asset volume
    // eslint-disable-next-line no-unused-vars
    let { e: eventType, E: eventTime, k: ticks } = kline;
    // eslint-disable-next-line no-unused-vars
    let { o: open, h: high, l: low, c: close, v: volume, i: interval, x: isFinal, q: quoteVolume, t: time } = ticks; //n:trades, V:buyVolume, Q:quoteBuyVolume
    if ( time <= firstTime ) return;
    if ( !isFinal ) {
        if ( typeof ohlcLatest[symbol][interval].time !== 'undefined' ) {
            if ( ohlcLatest[symbol][interval].time > time ) return;
        }
        ohlcLatest[symbol][interval] = { open: open, high: high, low: low, close: close, volume: volume, time: time };
        return;
    }
    // Delete an element from the beginning so we don't run out of memory
    const first_updated = Object.keys( ohlc[symbol][interval] ).shift();
    if ( first_updated ) delete ohlc[symbol][interval][first_updated];
    ohlc[symbol][interval][time] = { open: open, high: high, low: low, close: close, volume: volume };
};


/**
 * Used by futures websockets chart cache
 * @param {string} symbol - symbol to get candlestick info
 * @param {string} interval - time interval, 1m, 3m, 5m ....
 * @param {array} ticks - tick array
 * @return {undefined}
 */
const futuresKlineData = ( symbol, interval, ticks ) => {
    let last_time = 0;
    if ( options.verbose ) console.info( 'futuresKlineData', symbol, interval, ticks );
    if ( isIterable( ticks ) ) {
        for ( let tick of ticks ) {
            // eslint-disable-next-line no-unused-vars
            let [ time, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBaseVolume, takerBuyQuoteVolume, ignored ] = tick;
            futuresTicks[symbol][interval][time] = { time, closeTime, open, high, low, close, volume, quoteVolume, takerBuyBaseVolume, takerBuyQuoteVolume, trades };
            last_time = time;
        }
        futuresMeta[symbol][interval].timestamp = last_time;
    }
};

/**
 * Used for /depth endpoint
 * @param {object} data - containing the bids and asks
 * @return {undefined}
 */
const depthData = data => {
    if ( !data ) return { bids: [], asks: [] };
    let bids = {}, asks = {}, obj;
    if ( typeof data.bids !== 'undefined' ) {
        for ( obj of data.bids ) {
            bids[obj[0]] = parseFloat( obj[1] );
        }
    }
    if ( typeof data.asks !== 'undefined' ) {
        for ( obj of data.asks ) {
            asks[obj[0]] = parseFloat( obj[1] );
        }
    }
    return { lastUpdateId: data.lastUpdateId, bids: bids, asks: asks };
}

/**
 * Used for /depth endpoint
 * @param {object} depth - information
 * @return {undefined}
 */
const depthHandler = depth => {
    let symbol = depth.s, obj;
    let context = depthCacheContext[symbol];
    let updateDepthCache = () => {
        depthCache[symbol].eventTime = depth.E;
        for ( obj of depth.b ) { //bids
            if ( obj[1] === '0.00000000' ) {
                delete depthCache[symbol].bids[obj[0]];
            } else {
                depthCache[symbol].bids[obj[0]] = parseFloat( obj[1] );
            }
        }
        for ( obj of depth.a ) { //asks
            if ( obj[1] === '0.00000000' ) {
                delete depthCache[symbol].asks[obj[0]];
            } else {
                depthCache[symbol].asks[obj[0]] = parseFloat( obj[1] );
            }
        }
        context.skipCount = 0;
        context.lastEventUpdateId = depth.u;
        context.lastEventUpdateTime = depth.E;
    };

    // This now conforms 100% to the Binance docs constraints on managing a local order book
    if ( context.lastEventUpdateId ) {
        const expectedUpdateId = context.lastEventUpdateId + 1;
        if ( depth.U <= expectedUpdateId ) {
            updateDepthCache();
        } else {
            let msg = 'depthHandler: [' + symbol + '] The depth cache is out of sync.';
            msg += ' Symptom: Unexpected Update ID. Expected "' + expectedUpdateId + '", got "' + depth.U + '"';
            if ( options.verbose ) options.log( msg );
            throw new Error( msg );
        }
    } else if ( depth.U > context.snapshotUpdateId + 1 ) {
        /* In this case we have a gap between the data of the stream and the snapshot.
             This is an out of sync error, and the connection must be torn down and reconnected. */
        let msg = 'depthHandler: [' + symbol + '] The depth cache is out of sync.';
        msg += ' Symptom: Gap between snapshot and first stream data.';
        if ( options.verbose ) options.log( msg );
        throw new Error( msg );
    } else if ( depth.u < context.snapshotUpdateId + 1 ) {
        /* In this case we've received data that we've already had since the snapshot.
             This isn't really an issue, and we can just update the cache again, or ignore it entirely. */

        // do nothing
    } else {
        // This is our first legal update from the stream data
        updateDepthCache();
    }
};

/**
 * Gets depth cache for given symbol
 * @param {string} symbol - the symbol to fetch
 * @return {object} - the depth cache object
 */
const getDepthCache = symbol => {
    if ( typeof depthCache[symbol] === 'undefined' ) return { bids: {}, asks: {} };
    return depthCache[symbol];
};

/**
 * Calculate Buy/Sell volume from DepthCache
 * @param {string} symbol - the symbol to fetch
 * @return {object} - the depth volume cache object
 */
const depthVolume = symbol => {
    let cache = getDepthCache( symbol ), quantity, price;
    let bidbase = 0, askbase = 0, bidqty = 0, askqty = 0;
    for ( price in cache.bids ) {
        quantity = cache.bids[price];
        bidbase += parseFloat( ( quantity * parseFloat( price ) ).toFixed( 8 ) );
        bidqty += quantity;
    }
    for ( price in cache.asks ) {
        quantity = cache.asks[price];
        askbase += parseFloat( ( quantity * parseFloat( price ) ).toFixed( 8 ) );
        askqty += quantity;
    }
    return { bids: bidbase, asks: askbase, bidQty: bidqty, askQty: askqty };
};

/**
 * Checks whether or not an array contains any duplicate elements
 * @param {array} array - the array to check
 * @return {boolean} - true or false
 */
const isArrayUnique = array => {
    let s = new Set( array );
    return s.size === array.length;
};

/**
 * Converts the futures liquidation stream data into a friendly object
 * @param {object} data - liquidation data callback data type
 * @return {object} - user friendly data type
 */
const fLiquidationConvertData = data => {
    let eventType = data.e, eventTime = data.E;
    let {
        s: symbol,
        S: side,
        o: orderType,
        f: timeInForce,
        q: origAmount,
        p: price,
        ap: avgPrice,
        X: orderStatus,
        l: lastFilledQty,
        z: totalFilledQty,
        T: tradeTime
    } = data.o;
    return { symbol, side, orderType, timeInForce, origAmount, price, avgPrice, orderStatus, lastFilledQty, totalFilledQty, eventType, tradeTime, eventTime };
};

/**
 * Converts the futures ticker stream data into a friendly object
 * @param {object} data - user data callback data type
 * @return {object} - user friendly data type
 */
const fTickerConvertData = data => {
    let friendlyData = data => {
        let {
            e: eventType,
            E: eventTime,
            s: symbol,
            p: priceChange,
            P: percentChange,
            w: averagePrice,
            c: close,
            Q: closeQty,
            o: open,
            h: high,
            l: low,
            v: volume,
            q: quoteVolume,
            O: openTime,
            C: closeTime,
            F: firstTradeId,
            L: lastTradeId,
            n: numTrades
        } = data;
        return {
            eventType,
            eventTime,
            symbol,
            priceChange,
            percentChange,
            averagePrice,
            close,
            closeQty,
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
        };
    }
    if ( Array.isArray( data ) ) {
        const result = [];
        for ( let obj of data ) {
            result.push( friendlyData( obj ) );
        }
        return result;
    }
    return friendlyData( data );
}

/**
 * Converts the futures miniTicker stream data into a friendly object
 * @param {object} data - user data callback data type
 * @return {object} - user friendly data type
 */
const fMiniTickerConvertData = data => {
    let friendlyData = data => {
        let {
            e: eventType,
            E: eventTime,
            s: symbol,
            c: close,
            o: open,
            h: high,
            l: low,
            v: volume,
            q: quoteVolume
        } = data;
        return {
            eventType,
            eventTime,
            symbol,
            close,
            open,
            high,
            low,
            volume,
            quoteVolume
        };
    }
    if ( Array.isArray( data ) ) {
        const result = [];
        for ( let obj of data ) {
            result.push( friendlyData( obj ) );
        }
        return result;
    }
    return friendlyData( data );
}

/**
 * Converts the futures bookTicker stream data into a friendly object
 * @param {object} data - user data callback data type
 * @return {object} - user friendly data type
 */
const fBookTickerConvertData = data => {
    let {
        u: updateId,
        s: symbol,
        b: bestBid,
        B: bestBidQty,
        a: bestAsk,
        A: bestAskQty
    } = data;
    return {
        updateId,
        symbol,
        bestBid,
        bestBidQty,
        bestAsk,
        bestAskQty
    };
}

/**
 * Converts the futures markPrice stream data into a friendly object
 * @param {object} data - user data callback data type
 * @return {object} - user friendly data type
 */
const fMarkPriceConvertData = data => {
    let friendlyData = data => {
        let {
            e: eventType,
            E: eventTime,
            s: symbol,
            p: markPrice,
            r: fundingRate,
            T: fundingTime
        } = data;
        return {
            eventType,
            eventTime,
            symbol,
            markPrice,
            fundingRate,
            fundingTime
        };
    }
    if ( Array.isArray( data ) ) {
        const result = [];
        for ( let obj of data ) {
            result.push( friendlyData( obj ) );
        }
        return result;
    }
    return friendlyData( data );
}

/**
 * Converts the futures aggTrade stream data into a friendly object
 * @param {object} data - user data callback data type
 * @return {object} - user friendly data type
 */
const fAggTradeConvertData = data => {
    let friendlyData = data => {
        let {
            e: eventType,
            E: eventTime,
            s: symbol,
            a: aggTradeId,
            p: price,
            q: amount,
            f: firstTradeId,
            l: lastTradeId,
            T: timestamp,
            m: maker
        } = data;
        return {
            eventType,
            eventTime,
            symbol,
            aggTradeId,
            price,
            amount,
            total: price    * amount,
            firstTradeId,
            lastTradeId,
            timestamp,
            maker
        };
    }
    if ( Array.isArray( data ) ) {
        const result = [];
        for ( let obj of data ) {
            result.push( friendlyData( obj ) );
        }
        return result;
    }
    return friendlyData( data );
}

window.binance = {
    /**
     * Futures WebSocket aggregated trades
     * @param {array/string} symbols - an array or string of symbols to query
     * @param {function} callback - callback function
     * @return {string} the websocket endpoint
     */
    futuresAggTradeStream: function futuresAggTradeStream( symbols, callback ) {
        let reconnect = () => { if ( options.reconnect ) futuresAggTradeStream( symbols, callback ) };
        let subscription, cleanCallback = data => callback( fAggTradeConvertData( data ) );
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'futuresAggTradeStream: "symbols" cannot contain duplicate elements.' );
            let streams = symbols.map( symbol => symbol.toLowerCase() + '@aggTrade' );
            subscription = futuresSubscribe( streams, cleanCallback, { reconnect } );
        } else {
            let symbol = symbols;
            subscription = futuresSubscribeSingle( symbol.toLowerCase() + '@aggTrade', cleanCallback, { reconnect } );
        }
        return subscription.endpoint;
    },

    /**
     * Futures WebSocket mark price
     * @param {symbol} symbol name or false. can also be a callback
     * @param {function} callback - callback function
     * @param {string} speed - 1 second updates. leave blank for default 3 seconds
     * @return {string} the websocket endpoint
     */
    futuresMarkPriceStream: function fMarkPriceStream( symbol = false, callback = console.log, speed = '@1s' ) {
        if ( typeof symbol == 'function' ) {
            callback = symbol;
            symbol = false;
        }
        let reconnect = () => {
            if ( options.reconnect ) fMarkPriceStream( symbol, callback );
        };
        const endpoint = symbol ? `${ symbol.toLowerCase() }@markPrice` : '!markPrice@arr'
        let subscription = futuresSubscribeSingle( endpoint + speed, data => callback( fMarkPriceConvertData( data ) ), { reconnect } );
        return subscription.endpoint;
    },

    /**
     * Futures WebSocket liquidations stream
     * @param {symbol} symbol name or false. can also be a callback
     * @param {function} callback - callback function
     * @return {string} the websocket endpoint
     */
    futuresLiquidationStream: function fLiquidationStream( symbol = false, callback = console.log ) {
        if ( typeof symbol == 'function' ) {
            callback = symbol;
            symbol = false;
        }
        let reconnect = () => {
            if ( options.reconnect ) fLiquidationStream( symbol, callback );
        };
        const endpoint = symbol ? `${ symbol.toLowerCase() }@forceOrder` : '!forceOrder@arr'
        let subscription = futuresSubscribeSingle( endpoint, data => callback( fLiquidationConvertData( data ) ), { reconnect } );
        return subscription.endpoint;
    },

    /**
     * Futures WebSocket prevDay ticker
     * @param {symbol} symbol name or false. can also be a callback
     * @param {function} callback - callback function
     * @return {string} the websocket endpoint
     */
    futuresTickerStream: function fTickerStream( symbol = false, callback = console.log ) {
        if ( typeof symbol == 'function' ) {
            callback = symbol;
            symbol = false;
        }
        let reconnect = () => {
            if ( options.reconnect ) fTickerStream( symbol, callback );
        };
        const endpoint = symbol ? `${ symbol.toLowerCase() }@ticker` : '!ticker@arr'
        let subscription = futuresSubscribeSingle( endpoint, data => callback( fTickerConvertData( data ) ), { reconnect } );
        return subscription.endpoint;
    },

    /**
    * Futures WebSocket miniTicker
    * @param {symbol} symbol name or false. can also be a callback
    * @param {function} callback - callback function
    * @return {string} the websocket endpoint
    */
    futuresMiniTickerStream: function fMiniTickerStream( symbol = false, callback = console.log ) {
        if ( typeof symbol == 'function' ) {
            callback = symbol;
            symbol = false;
        }
        let reconnect = () => {
            if ( options.reconnect ) fMiniTickerStream( symbol, callback );
        };
        const endpoint = symbol ? `${ symbol.toLowerCase() }@miniTicker` : '!miniTicker@arr'
        let subscription = futuresSubscribeSingle( endpoint, data => callback( fMiniTickerConvertData( data ) ), { reconnect } );
        return subscription.endpoint;
    },

    /**
    * Futures WebSocket bookTicker
    * @param {symbol} symbol name or false. can also be a callback
    * @param {function} callback - callback function
    * @return {string} the websocket endpoint
    */
    futuresBookTickerStream: function fBookTickerStream( symbol = false, callback = console.log ) {
        if ( typeof symbol == 'function' ) {
            callback = symbol;
            symbol = false;
        }
        let reconnect = () => {
            if ( options.reconnect ) fBookTickerStream( symbol, callback );
        };
        const endpoint = symbol ? `${ symbol.toLowerCase() }@bookTicker` : '!bookTicker'
        let subscription = futuresSubscribeSingle( endpoint, data => callback( fBookTickerConvertData( data ) ), { reconnect } );
        return subscription.endpoint;
    },

    /**
    * Websocket futures klines
    * @param {array/string} symbols - an array or string of symbols to query
    * @param {string} interval - the time interval
    * @param {function} callback - callback function
    * @param {int} limit - maximum results, no more than 1000
    * @return {string} the websocket endpoint
    */
    futuresChart: async function futuresChart( symbols, interval, callback, limit = 500 ) {
        let reconnect = () => { if ( options.reconnect ) futuresChart( symbols, interval, callback, limit ); };

        let futuresChartInit = symbol => {
            if ( typeof futuresMeta[symbol] === 'undefined' ) futuresMeta[symbol] = {};
            if ( typeof futuresMeta[symbol][interval] === 'undefined' ) futuresMeta[symbol][interval] = {};
            if ( typeof futuresTicks[symbol] === 'undefined' ) futuresTicks[symbol] = {};
            if ( typeof futuresTicks[symbol][interval] === 'undefined' ) futuresTicks[symbol][interval] = {};
            if ( typeof futuresRealtime[symbol] === 'undefined' ) futuresRealtime[symbol] = {};
            if ( typeof futuresRealtime[symbol][interval] === 'undefined' ) futuresRealtime[symbol][interval] = {};
            if ( typeof futuresKlineQueue[symbol] === 'undefined' ) futuresKlineQueue[symbol] = {};
            if ( typeof futuresKlineQueue[symbol][interval] === 'undefined' ) futuresKlineQueue[symbol][interval] = [];
            futuresMeta[symbol][interval].timestamp = 0;
        }

        /*
        let handleKlineStreamData = kline => {
            let symbol = kline.s;
            if ( !info[symbol] || !info[symbol][interval].timestamp ) {
                console.warn( `${ symbol } no info`, info[symbol], info[symbol][interval] );
                if ( kline !== null ) { //typeof klineQueue[symbol] !== 'undefined' && typeof klineQueue[symbol][interval] !== 'undefined' &&
                    klineQueue[symbol][interval].push( kline );
                }
            } else {
                if ( options.verbose ) options.log( 'spot @klines at ' + kline.k.t );
                klineHandler( symbol, kline );
                if ( callback ) callback( symbol, interval, klineConcat( symbol, interval ) );
            }
        };
        */
        let handleFuturesKlineStream = kline => {
            if ( !kline ) return console.error( `handleFuturesKlineStream: kline error`, kline );
            let symbol = kline.s, interval = kline.k.i;
            if ( !futuresMeta[symbol] || !futuresMeta[symbol][interval].timestamp ) {
                if ( typeof ( futuresKlineQueue[symbol][interval] ) !== 'undefined' && kline !== null ) {
                    futuresKlineQueue[symbol][interval].push( kline );
                }
            } else {
                //options.log('futures klines at ' + kline.k.t);
                futuresKlineHandler( symbol, kline );
                if ( callback ) callback( symbol, interval, futuresKlineConcat( symbol, interval ) );
            }
        };

        /* getSymbolKlineSnapshot
            publicRequest( base + 'v3/klines', { symbol, interval, limit }, function ( data ) {
                klineData( symbol, interval, data );
                //options.log('/klines at ' + info[symbol][interval].timestamp);
                if ( typeof klineQueue[symbol][interval] !== 'undefined' ) {
                    for ( let kline of klineQueue[symbol][interval] ) klineHandler( symbol, kline, info[symbol][interval].timestamp );
                    delete klineQueue[symbol][interval];
                }
                if ( callback ) callback( symbol, interval, klineConcat( symbol, interval ) );
            } );
        */
        let getFuturesKlineSnapshot = async ( symbol, limit = 500 ) => {
            let data = await promiseRequest( 'v1/klines', { symbol, interval, limit }, { base:fapi } );
            if ( options.verbose ) console.info( 'getFuturesKlineSnapshot', symbol, limit, data );
            futuresKlineData( symbol, interval, data );
            //options.log('/futures klines at ' + futuresMeta[symbol][interval].timestamp);
            if ( typeof futuresKlineQueue[symbol][interval] !== 'undefined' ) {
                for ( let kline of futuresKlineQueue[symbol][interval] ) futuresKlineHandler( symbol, kline, futuresMeta[symbol][interval].timestamp );
                delete futuresKlineQueue[symbol][interval];
            }
            if ( callback ) callback( symbol, interval, futuresKlineConcat( symbol, interval ) );
        };

        let subscription;
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'futuresChart: "symbols" array cannot contain duplicate elements.' );
            symbols.forEach( futuresChartInit );
            let streams = symbols.map( symbol => `${ symbol.toLowerCase() }@kline_${ interval }` );
            subscription = futuresSubscribe( streams, handleFuturesKlineStream, reconnect );
            symbols.forEach( element => getFuturesKlineSnapshot( element, limit ) );
        } else {
            let symbol = symbols;
            futuresChartInit( symbol );
            subscription = futuresSubscribeSingle( symbol.toLowerCase() + '@kline_' + interval, handleFuturesKlineStream, reconnect );
            getFuturesKlineSnapshot( symbol, limit );
        }
        return subscription.endpoint;
    },

    /**
    * Websocket futures candlesticks
    * @param {array/string} symbols - an array or string of symbols to query
    * @param {string} interval - the time interval
    * @param {function} callback - callback function
    * @return {string} the websocket endpoint
     */
    futuresCandlesticks: function futuresCandlesticks( symbols, interval, callback ) {
        let reconnect = () => {
            if ( options.reconnect ) futuresCandlesticks( symbols, interval, callback );
        };
        let subscription;
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'futuresCandlesticks: "symbols" array cannot contain duplicate elements.' );
            let streams = symbols.map( symbol => symbol.toLowerCase() + '@kline_' + interval );
            subscription = futuresSubscribe( streams, callback, { reconnect } );
        } else {
            let symbol = symbols.toLowerCase();
            subscription = futuresSubscribeSingle( symbol + '@kline_' + interval, callback, { reconnect } );
        }
        return subscription.endpoint;
    },


    /**
     * Subscribe to a generic websocket
     * @param {string} url - the websocket endpoint
     * @param {function} callback - optional execution callback
     * @param {boolean} reconnect - subscription callback
     * @return {WebSocket} the websocket reference
     */
    subscribe: function ( url, callback, reconnect = false ) {
        return subscribe( url, callback, reconnect );
    },

    /**
     * Subscribe to a generic combined websocket
     * @param {string} url - the websocket endpoint
     * @param {function} callback - optional execution callback
     * @param {boolean} reconnect - subscription callback
     * @return {WebSocket} the websocket reference
     */
    subscribeCombined: function ( url, callback, reconnect = false ) {
        return subscribeCombined( url, callback, reconnect );
    },

    /**
     * Returns the known websockets subscriptions
     * @return {array} array of web socket subscriptions
     */
    subscriptions: function() {
        return subscriptions;
    },

    /**
     * Terminates a web socket
     * @param {string} endpoint - the string associated with the endpoint
     * @return {undefined}
     */
    terminate: function ( endpoint ) {
        if ( options.verbose ) options.log( 'WebSocket terminating:', endpoint );
        return terminate( endpoint );
    },

    /**
     * Websocket depth chart
     * @param {array/string} symbols - an array or string of symbols to query
     * @param {function} callback - callback function
     * @return {string} the websocket endpoint
     */
    depth: function depth ( symbols, callback ) {
        let reconnect = () => { if ( options.reconnect ) depth( symbols, callback ) };
        let subscription;
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'depth: "symbols" cannot contain duplicate elements.' );
            let streams = symbols.map( function ( symbol ) {
                return symbol.toLowerCase() + '@depth@100ms';
            } );
            subscription = subscribeCombined( streams, callback, reconnect );
        } else {
            let symbol = symbols;
            subscription = subscribe( symbol.toLowerCase() + '@depth@100ms', callback, reconnect );
        }
        return subscription.endpoint;
    },

    /**
     * Websocket depth cache
     * @param {array/string} symbols - an array or string of symbols to query
     * @param {function} callback - callback function
     * @param {int} limit - the number of entries
     * @return {string} the websocket endpoint
     */
    depthCache: function depthCacheFunction( symbols, callback, limit = 500 ) {
        let reconnect = () => { if ( options.reconnect ) depthCacheFunction( symbols, callback, limit ) };

        let symbolDepthInit = symbol => {
            if ( typeof depthCacheContext[symbol] === 'undefined' ) depthCacheContext[symbol] = {};
            let context = depthCacheContext[symbol];
            context.snapshotUpdateId = null;
            context.lastEventUpdateId = null;
            context.messageQueue = [];
            depthCache[symbol] = { bids: {}, asks: {} };
        };

        let assignEndpointIdToContext = ( symbol, endpointId ) => {
            if ( depthCacheContext[symbol] ) {
                let context = depthCacheContext[symbol];
                context.endpointId = endpointId;
            }
        };

        let handleDepthStreamData = depth => {
            let symbol = depth.s;
            let context = depthCacheContext[symbol];
            if ( context.messageQueue && !context.snapshotUpdateId ) {
                context.messageQueue.push( depth );
            } else {
                try {
                    depthHandler( depth );
                } catch ( err ) {
                    return terminate( context.endpointId, true );
                }
                if ( callback ) callback( symbol, depthCache[symbol], context );
            }
        };

        let getSymbolDepthSnapshot = ( symbol, cb ) => {
            publicRequest( base + 'v3/depth', { symbol, limit }, function ( json ) {
                //if ( error ) return cb( error, null );
                json.symb = symbol;
                //cb( null, json )
                cb( json );
            } );
        };

        let updateSymbolDepthCache = json => {
            // Get previous store symbol
            let symbol = json.symb;
            // Initialize depth cache from snapshot
            depthCache[symbol] = depthData( json );
            // Prepare depth cache context
            let context = depthCacheContext[symbol];
            context.snapshotUpdateId = json.lastUpdateId;
            context.messageQueue = context.messageQueue.filter( depth => depth.u > context.snapshotUpdateId );
            // Process any pending depth messages
            for ( let depth of context.messageQueue ) {
                /* Although sync errors shouldn't ever happen here, we catch and swallow them anyway
                    just in case. The stream handler function above will deal with broken caches. */
                try {
                    depthHandler( depth );
                } catch ( err ) {
                    // Do nothing
                }
            }
            delete context.messageQueue;
            if ( callback ) callback( symbol, depthCache[symbol] );
        };

        let subscription;
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'depthCache: "symbols" cannot contain duplicate elements.' );
            symbols.forEach( symbolDepthInit );
            let streams = symbols.map( function ( symbol ) {
                return symbol.toLowerCase() + `@depth@100ms`;
            } );
            subscription = subscribeCombined( streams, handleDepthStreamData, reconnect, function () {
                async.mapLimit( symbols, 50, getSymbolDepthSnapshot, ( err, results ) => {
                    if ( err ) throw err;
                    results.forEach( updateSymbolDepthCache );
                } );
            } );
            symbols.forEach( s => assignEndpointIdToContext( s, subscription.endpoint ) );
        } else {
            let symbol = symbols;
            symbolDepthInit( symbol );
            subscription = subscribe( symbol.toLowerCase() + `@depth@100ms`, handleDepthStreamData, reconnect, function () {
                async.mapLimit( [ symbol ], 1, getSymbolDepthSnapshot, ( err, results ) => {
                    if ( err ) throw err;
                    results.forEach( updateSymbolDepthCache );
                } );
            } );
            assignEndpointIdToContext( symbol, subscription.endpoint );
        }
        return subscription.endpoint;
    },

    /**
     * Clear Websocket depth cache
     * @param {String|Array} symbols   - a single symbol, or an array of symbols, to clear the cache of
     * @returns {void}
     */
    clearDepthCache( symbols ) {
        const symbolsArr = Array.isArray( symbols ) ? symbols : [ symbols ];
        symbolsArr.forEach( thisSymbol => {
            delete depthCache[thisSymbol];
        } );
    },

    /**
     * Websocket staggered depth cache
     * @param {array/string} symbols - an array of symbols to query
     * @param {function} callback - callback function
     * @param {int} limit - the number of entries
     * @param {int} stagger - ms between each depth cache
     * @return {Promise} the websocket endpoint
     */
    depthCacheStaggered: function ( symbols, callback, limit = 100, stagger = 200 ) {
        if ( !Array.isArray( symbols ) ) symbols = [ symbols ];
        let chain = null;

        symbols.forEach( symbol => {
            let promise = () => new Promise( resolve => {
                this.depthCache( symbol, callback, limit );
                setTimeout( resolve, stagger );
            } );
            chain = chain ? chain.then( promise ) : promise();
        } );

        return chain;
    },

    /**
     * Websocket aggregated trades
     * @param {array/string} symbols - an array or string of symbols to query
     * @param {function} callback - callback function
     * @return {string} the websocket endpoint
     */
    aggTrades: function trades( symbols, callback ) {
        let reconnect = () => {
            if ( options.reconnect ) trades( symbols, callback );
        };
        let subscription;
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'trades: "symbols" cannot contain duplicate elements.' );
            let streams = symbols.map( function ( symbol ) {
                return symbol.toLowerCase() + '@aggTrade';
            } );
            subscription = subscribeCombined( streams, callback, reconnect );
        } else {
            let symbol = symbols;
            subscription = subscribe( symbol.toLowerCase() + '@aggTrade', callback, reconnect );
        }
        return subscription.endpoint;
    },

    /**
       * Websocket raw trades
       * @param {array/string} symbols - an array or string of symbols to query
       * @param {function} callback - callback function
       * @return {string} the websocket endpoint
    */
    trades: function trades( symbols, callback ) {
        let reconnect = () => { if ( options.reconnect ) trades( symbols, callback ) };
        let subscription;
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'trades: "symbols" cannot contain duplicate elements.' );
            let streams = symbols.map( function ( symbol ) {
                return symbol.toLowerCase() + '@trade';
            } );
            subscription = subscribeCombined( streams, callback, reconnect );
        } else {
            let symbol = symbols;
            subscription = subscribe( symbol.toLowerCase() + '@trade', callback, reconnect );
        }
        return subscription.endpoint;
    },

    /**
     * Websocket klines
     * @param {array/string} symbols - an array or string of symbols to query
     * @param {string} interval - the time interval
     * @param {function} callback - callback function
     * @param {int} limit - maximum results, no more than 1000
     * @return {string} the websocket endpoint
     */
    chart: function chart( symbols, interval, callback, limit = 500 ) {
        let reconnect = () => { if ( options.reconnect ) chart( symbols, interval, callback, limit ) };

        let symbolChartInit = symbol => {
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

        let handleKlineStreamData = kline => {
            let symbol = kline.s, interval = kline.k.i;
            if ( !info[symbol] || !info[symbol][interval].timestamp ) {
                console.warn( `${ symbol } no info`, info[symbol], info[symbol][interval] );
                if ( kline !== null ) { //typeof klineQueue[symbol] !== 'undefined' && typeof klineQueue[symbol][interval] !== 'undefined' &&
                    klineQueue[symbol][interval].push( kline );
                }
            } else {
                if ( options.verbose ) options.log( 'spot @klines at ' + kline.k.t );
                klineHandler( symbol, kline );
                if ( callback ) callback( symbol, interval, klineConcat( symbol, interval ) );
            }
        };

        let getSymbolKlineSnapshot = ( symbol, limit = 500 ) => {
            publicRequest( base + 'v3/klines', { symbol, interval, limit }, function ( data ) {
                klineData( symbol, interval, data );
                //options.log('/klines at ' + info[symbol][interval].timestamp);
                if ( typeof klineQueue[symbol][interval] !== 'undefined' ) {
                    for ( let kline of klineQueue[symbol][interval] ) klineHandler( symbol, kline, info[symbol][interval].timestamp );
                    delete klineQueue[symbol][interval];
                }
                if ( callback ) callback( symbol, interval, klineConcat( symbol, interval ) );
            } );
        };

        let subscription;
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'chart: "symbols" cannot contain duplicate elements.' );
            symbols.forEach( symbolChartInit );
            let streams = symbols.map( function ( symbol ) {
                return symbol.toLowerCase() + '@kline_' + interval;
            } );
            subscription = subscribeCombined( streams, handleKlineStreamData, reconnect );
            symbols.forEach( element => getSymbolKlineSnapshot( element, limit ) );
        } else {
            let symbol = symbols;
            symbolChartInit( symbol );
            subscription = subscribe( symbol.toLowerCase() + '@kline_' + interval, handleKlineStreamData, reconnect );
            getSymbolKlineSnapshot( symbol, limit );
        }
        return subscription.endpoint;
    },

    /**
     * Websocket candle sticks
     * @param {array/string} symbols - an array or string of symbols to query
     * @param {string} interval - the time interval
     * @param {function} callback - callback function
     * @return {string} the websocket endpoint
     */
    candlesticks: function candlesticks( symbols, interval, callback ) {
        let reconnect = () => { if ( options.reconnect ) candlesticks( symbols, interval, callback ) };
        let subscription;
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'candlesticks: "symbols" cannot contain duplicate elements.' );
            let streams = symbols.map( function ( symbol ) {
                return symbol.toLowerCase() + '@kline_' + interval;
            } );
            subscription = subscribeCombined( streams, callback, reconnect );
        } else {
            let symbol = symbols.toLowerCase();
            subscription = subscribe( symbol + '@kline_' + interval, callback, reconnect );
        }
        return subscription.endpoint;
    },

    /**
     * Websocket mini ticker
     * @param {function} callback - callback function
     * @return {string} the websocket endpoint
     */
    miniTicker: function miniTicker( callback ) {
        let reconnect = () => { if ( options.reconnect ) miniTicker( callback ) };
        let subscription = subscribe( '!miniTicker@arr', function ( data ) {
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
            callback( markets );
        }, reconnect );
        return subscription.endpoint;
    },

    /**
     * Spot WebSocket bookTicker (bid/ask quotes including price & amount)
     * @param {symbol} symbol name or false. can also be a callback
     * @param {function} callback - callback function
     * @return {string} the websocket endpoint
     */
    bookTickers: function bookTickerStream( symbol = false, callback = console.log ) {
        if ( typeof symbol == 'function' ) {
            callback = symbol;
            symbol = false;
        }
        let reconnect = () => { if ( options.reconnect ) bookTickerStream( symbol, callback ) };
        const endpoint = symbol ? `${ symbol.toLowerCase() }@bookTicker` : '!bookTicker'
        let subscription = subscribe( endpoint, data => callback( fBookTickerConvertData( data ) ), reconnect );
        return subscription.endpoint;
    },

    /**
     * Websocket prevday percentage
     * @param {array/string} symbols - an array or string of symbols to query
     * @param {function} callback - callback function
     * @param {boolean} singleCallback - avoid call one callback for each symbol in data array
     * @return {string} the websocket endpoint
     */
    prevDay: function prevDay( symbols, callback, singleCallback ) {
        let subscription, reconnect = () => { if ( options.reconnect ) prevDay( symbols, callback ) };
        if ( Array.isArray( symbols ) ) {
            if ( !isArrayUnique( symbols ) ) throw Error( 'prevDay: "symbols" cannot contain duplicate elements.' );
            let streams = symbols.map( symbol => symbol.toLowerCase() + '@ticker' );
            subscription = subscribeCombined( streams, function ( data ) {
                prevDayStreamHandler( data, callback );
            }, reconnect );
        } else if ( symbols ) {
            let symbol = symbols;
            subscription = subscribe( symbol.toLowerCase() + '@ticker', function ( data ) {
                prevDayStreamHandler( data, callback );
            }, reconnect );
        } else {
            subscription = subscribe( '!ticker@arr', function ( data ) {
                if ( singleCallback ) {
                    prevDayStreamHandler( data, callback );
                } else {
                    for ( let line of data ) {
                        prevDayStreamHandler( line, callback );
                    }
                }
            }, reconnect );
        }
        return subscription.endpoint;
    },

    /**
     * Gets depth cache for given symbol
     * @param {symbol} symbol - get depch cache for this symbol
     * @return {object} - object
     */
    depthCache: symbol => {
        return getDepthCache( symbol );
    },

    /**
     * Gets depth volume for given symbol
     * @param {symbol} symbol - get depch volume for this symbol
     * @return {object} - object
     */
    depthVolume: symbol => {
        return depthVolume( symbol );
    }
}