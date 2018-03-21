/*
(async () => {
    let api = require('./async.js');
    api.options('options.json');
    await api.useServerTime();
    console.log(await api.prices());
    console.log(await api.time());
    //console.log(await api.openOrders());
    //console.log(await api.balance());
})();
*/

// consider moving all websocket functions to binance-websockets

module.exports = function() {
    'use strict';
    const file = require('fs');
    const axios = require('axios');
    const crypto = require('crypto');
    let options = {};

    const defaults = {
        proxy: false,
        recvWindow: 5000,
        timeOffset: 0,
        useServerTime: false,
        reconnect: true,
        verbose: false,
        test: false,
        log: function() {
            console.log(Array.prototype.slice.call(arguments));
        }
    };

    async function request(url, data = {}, flags = {}) {
        const base = 'https://api.binance.com/api/';
        const wapi = 'https://api.binance.com/wapi/';
        const userAgent = 'Mozilla/4.0 (compatible; Node Binance API)';
        const contentType = 'application/x-www-form-urlencoded';
        let headers = {
            'User-Agent': userAgent,
            'Content-type': contentType
        };
        if ( typeof flags.method === 'undefined' ) flags.method = 'GET'; // GET POST PUT DELETE
        if ( typeof flags.type === 'undefined' ) flags.type = false; // Endpoint security: TRADE, MARKET, SIGNED
        else {
            if ( typeof data.recvWindow === 'undefined' ) data.recvWindow = options.recvWindow;
            headers['X-MBX-APIKEY'] = options.APIKEY;
            if ( !options.APIKEY ) return new Error('Invalid API Key');
        }
        if ( flags.type === 'SIGNED' ) {
            if ( !options.APISECRET ) return new Error('Invalid API Secret');
            data.timestamp = new Date().getTime() + options.timeOffset;
            let query = Object.keys(data).reduce(function(a,k){a.push(k+'='+encodeURIComponent(data[k]));return a},[]).join('&');
            data.signature = crypto.createHmac('sha256', options.APISECRET).update(query).digest('hex'); // HMAC hash header
        }
        try {
            const response = await axios.request({
                url: url,
                params: data,
                method: flags.method,
                headers: headers,
                timeout: options.recvWindow,
                proxy: options.proxy,
                baseURL: typeof flags.wapi === 'undefined' ? base : wapi,
            });
            if ( response && response.status !== 200 ) return new Error(JSON.stringify(response.data));
            return response.data;
        } catch ( error ) {
            return new Error(JSON.stringify(error.response.data)); // error.message
        }
    }

    return {
        options: function(opt) {
            // Accept options as string (load json from file) or object
            if ( typeof opt === 'string' ) options = JSON.parse(file.readFileSync(opt));
            else options = opt;
            // Set default options
            for ( let key in defaults ) {
                if ( typeof options[key] === 'undefined' ) {
                    options[key] = defaults[key];
                }
            }
        },

        useServerTime: async function useServerTime() {
            const response = await request('/v1/time');
            options.timeOffset = response.serverTime - new Date().getTime();
            return response.serverTime;
        },

        time: async function time() {
            const response = await request('/v1/time');
            return response.serverTime;
        },

        // prices({symbol:'BTCUSDT'}) or prices()
        prices: async function prices(flags = {}) {
            let url = '/v3/ticker/price';
            if ( typeof flags.symbol !== 'undefined' ) url+= '?symbol=' + flags.symbol;
            return await request(url);
        },

        // openOrders({symbol:'BTCUSDT'}) or openOrders()
        openOrders: async function(symbol = false) {
            let parameters = symbol ? {symbol:symbol} : {};
            return await request('/v3/openOrders', parameters, {type: 'SIGNED'});
        },

        balance: async function() {
            return request('/v3/account', {}, {type: 'SIGNED'});
        }
    }
}();
