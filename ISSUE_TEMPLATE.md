**Title**
- bug: XYZ broken
- feature: please add
- enhancement: add this to existing features

**Short Description:**
- Unable to get a result from blah
  
**Platform:**
- windows
- linux
- macos

**node version:**
- 9.11

**Long descrption**
- Doing xyz results in ypr and failing when fph

**code**
```
const util = require('util');
const binance = require('node-binance-api');
binance.options({
  APIKEY: '<key>',
  APISECRET: '<secret>',
  useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
  test: true // If you want to use sandbox mode where orders are simulated
});

util.inspect( binance );
```

**result**
```
{
   "result":"result"
}
```

thank you
