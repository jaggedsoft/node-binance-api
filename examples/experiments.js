// Connect to all websocket endpoints without using the library
(async () => {
  const axios = require('axios');
  const WebSocket = require('ws');
  let streams = [];
  let markets = [];
  let prevDay = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
  for ( let obj of prevDay.data ) {
    markets.push(obj.symbol);
    streams.push(obj.symbol.toLowerCase()+'@aggTrade');
  }
  console.log(markets);
  
  const ws = new WebSocket('wss://stream.binance.com:9443/stream?streams='+streams.join('/'));
  ws.on('message', function(payload) {
    let json = JSON.parse(payload), stream = json.stream, data = json.data;
    if ( data.e == 'aggTrade' ) {
      console.log(data.s+' price: '+data.p);
    } else console.log(stream, data);
  });
})();
