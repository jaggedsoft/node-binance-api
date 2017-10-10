[![Latest node](https://img.shields.io/node/v/v.svg)]()
[![Complete coverage](https://camo.githubusercontent.com/f52b6b64144aedecb7596469a608ddf7982a5b01/68747470733a2f2f696d672e736869656c64732e696f2f636f766572616c6c732f726571756573742f726571756573742d70726f6d6973652e7376673f7374796c653d666c61742d737175617265266d61784167653d32353932303030)]()
[![Build passing](https://camo.githubusercontent.com/16cf66fb5419c83391ce98044e110bc0d4ca1a46/68747470733a2f2f696d672e736869656c64732e696f2f7472617669732f726571756573742f726571756573742f6d61737465722e7376673f7374796c653d666c61742d737175617265)]()
[![Dependencies up to date](https://camo.githubusercontent.com/895093f8ef43722ff6c4bd61cd720199e76de812/68747470733a2f2f696d672e736869656c64732e696f2f64617669642f726571756573742f726571756573742e7376673f7374796c653d666c61742d737175617265)]()
[![GitHub last commit](https://img.shields.io/github/last-commit/jaggedsoft/node-binance-api.svg)]()

# Node Binance API
This project is to help get you started trading on Binance with the API and is designed to be easy to use. You can stream candlestick chart data, or use other advanced features such as setting stop losses and iceberg orders. This project seeks to have complete API coverage including WebSockets and will be updated regularly.

#### Installation
```
npm install node-binance-api --save
```

#### Getting started
```javascript
const binance = require('node-binance-api');
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
<details>
 <summary>View Response</summary>

```js
{ ETHBTC: '0.07003500',
  LTCBTC: '0.01176700',
  BNBBTC: '0.00035735',
  NEOBTC: '0.00809500',
  QTUMETH: '0.03851200',
  EOSETH: '0.00189600',
  SNTETH: '0.00008595',
  BNTETH: '0.00738800',
  BCCBTC: '0.08104000',
  GASBTC: '0.00629800',
  BNBETH: '0.00509495',
  BTMETH: '0.00018900',
  HCCBTC: '0.00000180',
  BTCUSDT: '4464.44000000',
  ETHUSDT: '312.89000000',
  HSRBTC: '0.00289000',
  OAXETH: '0.00180000',
  DNTETH: '0.00014190',
  MCOETH: '0.02358300',
  ICNETH: '0.00557000',
  ELCBTC: '0.00000053',
  MCOBTC: '0.00166900',
  WTCBTC: '0.00184138',
  WTCETH: '0.02601700',
  LLTBTC: '0.00001669',
  LRCBTC: '0.00001100',
  LRCETH: '0.00016311',
  QTUMBTC: '0.00271600',
  YOYOBTC: '0.00000481',
  OMGBTC: '0.00187800',
  OMGETH: '0.02677400',
  ZRXBTC: '0.00004319',
  ZRXETH: '0.00060800',
  STRATBTC: '0.00087800',
  STRATETH: '0.01218800',
  SNGLSBTC: '0.00003649',
  SNGLSETH: '0.00051280',
  BQXBTC: '0.00013150',
  BQXETH: '0.00184240',
  KNCBTC: '0.00038969',
  KNCETH: '0.00550320',
  FUNBTC: '0.00000573',
  FUNETH: '0.00008433',
  SNMBTC: '0.00003176',
  SNMETH: '0.00047119',
  NEOETH: '0.11500200',
  IOTABTC: '0.00012136',
  IOTAETH: '0.00171001',
  LINKBTC: '0.00010646',
  LINKETH: '0.00150999',
  XVGBTC: '0.00000145',
  XVGETH: '0.00002059',
  CTRBTC: '0.00025532',
  CTRETH: '0.00375180',
  SALTBTC: '0.00080100',
  SALTETH: '0.01140000',
  MDABTC: '0.00057002',
  MDAETH: '0.00819490' }
//Price of BNB:  0.00035735
```
</details>


#### Getting list of current balances
```javascript
binance.balance(function(balances) {
	console.log("balances()", balances);
	console.log("ETH balance: ", balances.ETH.available);
});
```
<details>
 <summary>View Response</summary>

```js
{ BTC: { available: '0.77206464', onOrder: '0.00177975' },
  LTC: { available: '0.00000000', onOrder: '0.00000000' },
  ETH: { available: '1.14109900', onOrder: '0.00000000' },
  BNC: { available: '0.00000000', onOrder: '0.00000000' },
  ICO: { available: '0.00000000', onOrder: '0.00000000' },
  NEO: { available: '0.00000000', onOrder: '0.00000000' },
  BNB: { available: '41.33761879', onOrder: '0.00000000' },
  QTUM: { available: '0.00000000', onOrder: '0.00000000' },
  EOS: { available: '0.00000000', onOrder: '0.00000000' },
  SNT: { available: '0.00000000', onOrder: '0.00000000' },
  BNT: { available: '0.00000000', onOrder: '0.00000000' },
  GAS: { available: '0.00000000', onOrder: '0.00000000' },
  BCC: { available: '0.00000000', onOrder: '0.00000000' },
  BTM: { available: '0.00000000', onOrder: '0.00000000' },
  USDT: { available: '0.00000000', onOrder: '0.00000000' },
  HCC: { available: '0.00000000', onOrder: '0.00000000' },
  HSR: { available: '0.00000000', onOrder: '0.00000000' },
  OAX: { available: '0.00000000', onOrder: '0.00000000' },
  DNT: { available: '0.00000000', onOrder: '0.00000000' },
  MCO: { available: '0.00000000', onOrder: '0.00000000' },
  ICN: { available: '0.00000000', onOrder: '0.00000000' },
  ELC: { available: '0.00000000', onOrder: '0.00000000' },
  PAY: { available: '0.00000000', onOrder: '0.00000000' },
  ZRX: { available: '0.00000000', onOrder: '0.00000000' },
  OMG: { available: '0.00000000', onOrder: '0.00000000' },
  WTC: { available: '0.00000000', onOrder: '0.00000000' },
  LRX: { available: '0.00000000', onOrder: '0.00000000' },
  YOYO: { available: '0.00000000', onOrder: '0.00000000' },
  LRC: { available: '0.00000000', onOrder: '0.00000000' },
  LLT: { available: '0.00000000', onOrder: '0.00000000' },
  TRX: { available: '0.00000000', onOrder: '0.00000000' },
  FID: { available: '0.00000000', onOrder: '0.00000000' },
  SNGLS: { available: '0.00000000', onOrder: '0.00000000' },
  STRAT: { available: '0.00000000', onOrder: '0.00000000' },
  BQX: { available: '0.00000000', onOrder: '0.00000000' },
  FUN: { available: '0.00000000', onOrder: '0.00000000' },
  KNC: { available: '0.00000000', onOrder: '0.00000000' },
  CDT: { available: '0.00000000', onOrder: '0.00000000' },
  XVG: { available: '0.00000000', onOrder: '0.00000000' },
  IOTA: { available: '0.00000000', onOrder: '0.00000000' },
  SNM: { available: '0.76352833', onOrder: '0.00000000' },
  LINK: { available: '0.00000000', onOrder: '0.00000000' },
  CVC: { available: '0.00000000', onOrder: '0.00000000' },
  TNT: { available: '0.00000000', onOrder: '0.00000000' },
  REP: { available: '0.00000000', onOrder: '0.00000000' },
  CTR: { available: '0.00000000', onOrder: '0.00000000' },
  MDA: { available: '0.00000000', onOrder: '0.00000000' },
  MTL: { available: '0.00000000', onOrder: '0.00000000' },
  SALT: { available: '0.00000000', onOrder: '0.00000000' },
  NULS: { available: '0.00000000', onOrder: '0.00000000' } }
//ETH balance:  1.14109900
```
</details>

#### Getting bid/ask prices for a symbol
```javascript
binance.bookTickers(function(ticker) {
	console.log("bookTickers()", ticker);
	console.log("Price of BNB: ", ticker.BNBBTC);
});
```

#### Get all bid/ask prices
```javascript
binance.bookTickers(function(ticker) {
	console.log("bookTickers", ticker);
});
```
<details>
 <summary>View Response</summary>

```js
{ ETHBTC:
   { bid: '0.06187700',
     bids: '0.64000000',
     ask: '0.06188300',
     asks: '6.79700000' },
  LTCBTC:
   { bid: '0.01036000',
     bids: '14.96000000',
     ask: '0.01037000',
     asks: '0.60000000' },
  BNBBTC:
   { bid: '0.00028226',
     bids: '802.00000000',
     ask: '0.00028268',
     asks: '584.00000000' },
  NEOBTC:
   { bid: '0.00595600',
     bids: '33.00000000',
     ask: '0.00595900',
     asks: '37.00000000' },
  QTUMETH:
   { bid: '0.03958000',
     bids: '1.42000000',
     ask: '0.04024300',
     asks: '7.46000000' },
  EOSETH:
   { bid: '0.00192600',
     bids: '29.31000000',
     ask: '0.00193500',
     asks: '418.91000000' },
  SNTETH:
   { bid: '0.00007607',
     bids: '8864.00000000',
     ask: '0.00007682',
     asks: '1311.00000000' },
  BNTETH:
   { bid: '0.00740200',
     bids: '1.36000000',
     ask: '0.00746800',
     asks: '419.86000000' },
  BCCBTC:
   { bid: '0.06786500',
     bids: '0.18600000',
     ask: '0.06835400',
     asks: '0.72600000' },
  GASBTC:
   { bid: '0.00435500',
     bids: '332.73000000',
     ask: '0.00435600',
     asks: '18.31000000' },
  BNBETH:
   { bid: '0.00456443',
     bids: '4.00000000',
     ask: '0.00461795',
     asks: '192.00000000' },
  BTMETH:
   { bid: '0.00000000',
     bids: '0.00000000',
     ask: '0.00000000',
     asks: '0.00000000' },
  HCCBTC:
   { bid: '0.00000000',
     bids: '0.00000000',
     ask: '0.00000000',
     asks: '0.00000000' },
  BTCUSDT:
   { bid: '4801.05000000',
     bids: '0.82289400',
     ask: '4812.00000000',
     asks: '1.04753200' },
  ETHUSDT:
   { bid: '296.32000000',
     bids: '3.24294000',
     ask: '297.81000000',
     asks: '17.69901000' },
  HSRBTC:
   { bid: '0.00000000',
     bids: '0.00000000',
     ask: '0.00000000',
     asks: '0.00000000' },
  OAXETH:
   { bid: '0.00154500',
     bids: '422.64000000',
     ask: '0.00169200',
     asks: '159.94000000' },
  DNTETH:
   { bid: '0.00012059',
     bids: '434.00000000',
     ask: '0.00012100',
     asks: '8311.00000000' },
  MCOETH:
   { bid: '0.02566000',
     bids: '5.85000000',
     ask: '0.02651200',
     asks: '4.37000000' },
  ICNETH:
   { bid: '0.00489000',
     bids: '232.97000000',
     ask: '0.00500000',
     asks: '0.01000000' },
  ELCBTC:
   { bid: '0.00000000',
     bids: '0.00000000',
     ask: '0.00000000',
     asks: '0.00000000' },
  MCOBTC:
   { bid: '0.00162700',
     bids: '2.87000000',
     ask: '0.00163800',
     asks: '0.70000000' },
  WTCBTC:
   { bid: '0.00129604',
     bids: '600.00000000',
     ask: '0.00131600',
     asks: '1.00000000' },
  WTCETH:
   { bid: '0.02080000',
     bids: '30.00000000',
     ask: '0.02097600',
     asks: '24.00000000' },
  LLTBTC:
   { bid: '0.00000000',
     bids: '0.00000000',
     ask: '0.00000000',
     asks: '0.00000000' },
  LRCBTC:
   { bid: '0.00000000',
     bids: '0.00000000',
     ask: '0.00000000',
     asks: '0.00000000' },
  LRCETH:
   { bid: '0.00000000',
     bids: '0.00000000',
     ask: '0.00000000',
     asks: '0.00000000' },
  QTUMBTC:
   { bid: '0.00245100',
     bids: '43.11000000',
     ask: '0.00248500',
     asks: '74.96000000' },
  YOYOBTC:
   { bid: '0.00000000',
     bids: '0.00000000',
     ask: '0.00000000',
     asks: '0.00000000' },
  OMGBTC:
   { bid: '0.00160700',
     bids: '300.00000000',
     ask: '0.00161300',
     asks: '36.05000000' },
  OMGETH:
   { bid: '0.02597100',
     bids: '4.92000000',
     ask: '0.02633200',
     asks: '19.00000000' },
  ZRXBTC:
   { bid: '0.00003852',
     bids: '9.00000000',
     ask: '0.00003912',
     asks: '103.00000000' },
  ZRXETH:
   { bid: '0.00062997',
     bids: '645.00000000',
     ask: '0.00062998',
     asks: '5376.00000000' },
  STRATBTC:
   { bid: '0.00069200',
     bids: '50.50000000',
     ask: '0.00070000',
     asks: '6.54000000' },
  STRATETH:
   { bid: '0.01080400',
     bids: '5.00000000',
     ask: '0.01200000',
     asks: '5.88000000' },
  SNGLSBTC:
   { bid: '0.00003121',
     bids: '726.00000000',
     ask: '0.00003161',
     asks: '153.00000000' },
  SNGLSETH:
   { bid: '0.00046686',
     bids: '4782.00000000',
     ask: '0.00051906',
     asks: '32.00000000' },
  BQXBTC:
   { bid: '0.00011512',
     bids: '87.00000000',
     ask: '0.00011840',
     asks: '133.00000000' },
  BQXETH:
   { bid: '0.00183080',
     bids: '1051.00000000',
     ask: '0.00195000',
     asks: '626.00000000' },
  KNCBTC:
   { bid: '0.00027859',
     bids: '7.00000000',
     ask: '0.00028462',
     asks: '35.00000000' },
  KNCETH:
   { bid: '0.00452830',
     bids: '13.00000000',
     ask: '0.00454970',
     asks: '35.00000000' },
  FUNBTC:
   { bid: '0.00000464',
     bids: '753.00000000',
     ask: '0.00000465',
     asks: '13924.00000000' },
  FUNETH:
   { bid: '0.00007126',
     bids: '44131.00000000',
     ask: '0.00007617',
     asks: '1419.00000000' },
  SNMBTC:
   { bid: '0.00002489',
     bids: '564.00000000',
     ask: '0.00002559',
     asks: '2553.00000000' },
  SNMETH:
   { bid: '0.00040060',
     bids: '374.00000000',
     ask: '0.00041494',
     asks: '7624.00000000' },
  NEOETH:
   { bid: '0.09604700',
     bids: '22.05000000',
     ask: '0.09800000',
     asks: '0.31000000' },
  IOTABTC:
   { bid: '0.00009515',
     bids: '3.00000000',
     ask: '0.00009529',
     asks: '147.00000000' },
  IOTAETH:
   { bid: '0.00150002',
     bids: '4311.00000000',
     ask: '0.00155216',
     asks: '7.00000000' },
  LINKBTC:
   { bid: '0.00007601',
     bids: '4337.00000000',
     ask: '0.00007630',
     asks: '525.00000000' },
  LINKETH:
   { bid: '0.00121903',
     bids: '3784.00000000',
     ask: '0.00122965',
     asks: '200.00000000' },
  XVGBTC:
   { bid: '0.00000113',
     bids: '470101.00000000',
     ask: '0.00000114',
     asks: '147728.00000000' },
  XVGETH:
   { bid: '0.00001813',
     bids: '8274.00000000',
     ask: '0.00001843',
     asks: '8320.00000000' },
  CTRBTC:
   { bid: '0.00020202',
     bids: '625.00000000',
     ask: '0.00020649',
     asks: '1143.00000000' },
  CTRETH:
   { bid: '0.00330510',
     bids: '387.00000000',
     ask: '0.00339330',
     asks: '436.00000000' },
  SALTBTC:
   { bid: '0.00063500',
     bids: '76.00000000',
     ask: '0.00064300',
     asks: '437.54000000' },
  SALTETH:
   { bid: '0.01014200',
     bids: '202.79000000',
     ask: '0.01122600',
     asks: '1.36000000' },
  MDABTC:
   { bid: '0.00038061',
     bids: '8.00000000',
     ask: '0.00041300',
     asks: '1772.00000000' },
  MDAETH:
   { bid: '0.00655000',
     bids: '547.00000000',
     ask: '0.00660830',
     asks: '8814.00000000' },
  MTLBTC:
   { bid: '0.00140600',
     bids: '0.11000000',
     ask: '0.00143800',
     asks: '12.00000000' },
  MTLETH:
   { bid: '0.02300000',
     bids: '1166.86000000',
     ask: '0.02489500',
     asks: '13.98000000' },
  SUBBTC:
   { bid: '0.00003580',
     bids: '7617.00000000',
     ask: '0.00003619',
     asks: '1052.00000000' },
  SUBETH:
   { bid: '0.00056500',
     bids: '3649.00000000',
     ask: '0.00059988',
     asks: '3649.00000000' } }
```
</details>

#### Get market depth for a symbol
```javascript
binance.depth("SNMBTC", function(depth) {
	console.log("market depth", depth);
});
```
<details>
 <summary>View Response</summary>

```js
{ lastUpdateId: 316241,
  bids:
   [ [ '0.00002482', '9670.00000000', [] ],
     [ '0.00002481', '400.00000000', [] ],
     [ '0.00002476', '1228.00000000', [] ],
     [ '0.00002469', '817.00000000', [] ],
     [ '0.00002467', '700.00000000', [] ],
     [ '0.00002466', '3367.00000000', [] ],
     [ '0.00002465', '3112.00000000', [] ],
     [ '0.00002453', '164.00000000', [] ],
     [ '0.00002452', '6693.00000000', [] ],
     [ '0.00002451', '10000.00000000', [] ],
     [ '0.00002450', '27906.00000000', [] ],
     [ '0.00002431', '38203.00000000', [] ],
     [ '0.00002430', '11934.00000000', [] ],
     [ '0.00002426', '4090.00000000', [] ],
     [ '0.00002425', '19739.00000000', [] ],
     [ '0.00002420', '7259.00000000', [] ],
     [ '0.00002408', '20100.00000000', [] ],
     [ '0.00002400', '3343.00000000', [] ],
     [ '0.00002392', '13145.00000000', [] ],
     [ '0.00002390', '22195.00000000', [] ],
     [ '0.00002387', '31432.00000000', [] ],
     [ '0.00002370', '20500.00000000', [] ],
     [ '0.00002369', '10510.00000000', [] ],
     [ '0.00002355', '10000.00000000', [] ],
     [ '0.00002353', '57368.00000000', [] ],
     [ '0.00002346', '9136.00000000', [] ],
     [ '0.00002335', '263.00000000', [] ],
     [ '0.00002330', '9198.00000000', [] ],
     [ '0.00002310', '40346.00000000', [] ],
     [ '0.00002309', '16208.00000000', [] ],
     [ '0.00002301', '1129.00000000', [] ],
     [ '0.00002300', '2818.00000000', [] ],
     [ '0.00002299', '5000.00000000', [] ],
     [ '0.00002291', '10000.00000000', [] ],
     [ '0.00002290', '30647.00000000', [] ],
     [ '0.00002281', '1481.00000000', [] ],
     [ '0.00002261', '1476.00000000', [] ],
     [ '0.00002255', '10100.00000000', [] ],
     [ '0.00002251', '7441.00000000', [] ],
     [ '0.00002250', '37543.00000000', [] ],
     [ '0.00002242', '1000.00000000', [] ],
     [ '0.00002240', '5000.00000000', [] ],
     [ '0.00002232', '1000.00000000', [] ],
     [ '0.00002228', '1000.00000000', [] ],
     [ '0.00002225', '19062.00000000', [] ],
     [ '0.00002224', '1000.00000000', [] ],
     [ '0.00002222', '111200.00000000', [] ],
     [ '0.00002211', '1500.00000000', [] ],
     [ '0.00002210', '13191.00000000', [] ],
     [ '0.00002202', '200.00000000', [] ],
     [ '0.00002200', '82204.00000000', [] ],
     [ '0.00002163', '9313.00000000', [] ],
     [ '0.00002161', '1500.00000000', [] ],
     [ '0.00002138', '267.00000000', [] ],
     [ '0.00002128', '1000.00000000', [] ],
     [ '0.00002121', '22616.00000000', [] ],
     [ '0.00002120', '50.00000000', [] ],
     [ '0.00002116', '1000.00000000', [] ],
     [ '0.00002109', '1000.00000000', [] ],
     [ '0.00002106', '1000.00000000', [] ],
     [ '0.00002105', '250.00000000', [] ],
     [ '0.00002101', '739.00000000', [] ],
     [ '0.00002100', '3116.00000000', [] ],
     [ '0.00002096', '1000.00000000', [] ],
     [ '0.00002066', '1000.00000000', [] ],
     [ '0.00002056', '2548.00000000', [] ],
     [ '0.00002050', '31294.00000000', [] ],
     [ '0.00002041', '60363.00000000', [] ],
     [ '0.00002040', '55463.00000000', [] ],
     [ '0.00002020', '10992.00000000', [] ],
     [ '0.00002018', '5350.00000000', [] ],
     [ '0.00002017', '224200.00000000', [] ],
     [ '0.00002010', '3168.00000000', [] ],
     [ '0.00002005', '1000.00000000', [] ],
     [ '0.00002001', '28439.00000000', [] ],
     [ '0.00002000', '38274.00000000', [] ],
     [ '0.00001999', '25012.00000000', [] ],
     [ '0.00001993', '18944.00000000', [] ],
     [ '0.00001990', '200.00000000', [] ],
     [ '0.00001989', '500.00000000', [] ],
     [ '0.00001981', '2713.00000000', [] ],
     [ '0.00001971', '10000.00000000', [] ],
     [ '0.00001950', '200.00000000', [] ],
     [ '0.00001948', '350.00000000', [] ],
     [ '0.00001947', '256753.00000000', [] ],
     [ '0.00001910', '2000.00000000', [] ],
     [ '0.00001905', '10000.00000000', [] ],
     [ '0.00001901', '100.00000000', [] ],
     [ '0.00001900', '22214.00000000', [] ],
     [ '0.00001890', '60.00000000', [] ],
     [ '0.00001856', '25846.00000000', [] ],
     [ '0.00001855', '50000.00000000', [] ],
     [ '0.00001806', '23000.00000000', [] ],
     [ '0.00001780', '506.00000000', [] ],
     [ '0.00001750', '10000.00000000', [] ],
     [ '0.00001700', '1000.00000000', [] ],
     [ '0.00001600', '2288.00000000', [] ],
     [ '0.00001538', '124.00000000', [] ],
     [ '0.00001528', '1000.00000000', [] ],
     [ '0.00001501', '11519.00000000', [] ] ],
  asks:
   [ [ '0.00002500', '383.00000000', [] ],
     [ '0.00002569', '2553.00000000', [] ],
     [ '0.00002570', '3407.00000000', [] ],
     [ '0.00002580', '7697.00000000', [] ],
     [ '0.00002583', '2808.00000000', [] ],
     [ '0.00002584', '6237.00000000', [] ],
     [ '0.00002593', '9219.00000000', [] ],
     [ '0.00002638', '3756.00000000', [] ],
     [ '0.00002639', '12370.00000000', [] ],
     [ '0.00002680', '3000.00000000', [] ],
     [ '0.00002690', '36921.00000000', [] ],
     [ '0.00002699', '300.00000000', [] ],
     [ '0.00002700', '13652.00000000', [] ],
     [ '0.00002701', '2534.00000000', [] ],
     [ '0.00002716', '1097.00000000', [] ],
     [ '0.00002733', '27437.00000000', [] ],
     [ '0.00002760', '753.00000000', [] ],
     [ '0.00002777', '333.00000000', [] ],
     [ '0.00002780', '155.00000000', [] ],
     [ '0.00002799', '6544.00000000', [] ],
     [ '0.00002800', '21654.00000000', [] ],
     [ '0.00002835', '190.00000000', [] ],
     [ '0.00002850', '3494.00000000', [] ],
     [ '0.00002870', '580.00000000', [] ],
     [ '0.00002893', '1000.00000000', [] ],
     [ '0.00002899', '47338.00000000', [] ],
     [ '0.00002910', '155.00000000', [] ],
     [ '0.00002920', '7557.00000000', [] ],
     [ '0.00002950', '1295.00000000', [] ],
     [ '0.00003000', '7304.00000000', [] ],
     [ '0.00003020', '190.00000000', [] ],
     [ '0.00003080', '500.00000000', [] ],
     [ '0.00003099', '1105.00000000', [] ],
     [ '0.00003100', '2713.00000000', [] ],
     [ '0.00003107', '9469.00000000', [] ],
     [ '0.00003110', '10000.00000000', [] ],
     [ '0.00003130', '1319.00000000', [] ],
     [ '0.00003148', '2156.00000000', [] ],
     [ '0.00003150', '500.00000000', [] ],
     [ '0.00003175', '7978.00000000', [] ],
     [ '0.00003176', '27692.00000000', [] ],
     [ '0.00003185', '17167.00000000', [] ],
     [ '0.00003186', '27692.00000000', [] ],
     [ '0.00003200', '90026.00000000', [] ],
     [ '0.00003215', '344.00000000', [] ],
     [ '0.00003218', '157145.00000000', [] ],
     [ '0.00003229', '553.00000000', [] ],
     [ '0.00003243', '12000.00000000', [] ],
     [ '0.00003247', '1755.00000000', [] ],
     [ '0.00003250', '2000.00000000', [] ],
     [ '0.00003290', '20673.00000000', [] ],
     [ '0.00003300', '28497.00000000', [] ],
     [ '0.00003308', '26452.00000000', [] ],
     [ '0.00003310', '1000.00000000', [] ],
     [ '0.00003333', '2138.00000000', [] ],
     [ '0.00003350', '20000.00000000', [] ],
     [ '0.00003366', '1894.00000000', [] ],
     [ '0.00003380', '500.00000000', [] ],
     [ '0.00003390', '742.00000000', [] ],
     [ '0.00003400', '8837.00000000', [] ],
     [ '0.00003429', '1688.00000000', [] ],
     [ '0.00003449', '31677.00000000', [] ],
     [ '0.00003450', '8181.00000000', [] ],
     [ '0.00003458', '4973.00000000', [] ],
     [ '0.00003460', '5181.00000000', [] ],
     [ '0.00003473', '500.00000000', [] ],
     [ '0.00003486', '1470.00000000', [] ],
     [ '0.00003500', '21103.00000000', [] ],
     [ '0.00003514', '2912.00000000', [] ],
     [ '0.00003560', '3261.00000000', [] ],
     [ '0.00003588', '2157.00000000', [] ],
     [ '0.00003600', '4699.00000000', [] ],
     [ '0.00003647', '500.00000000', [] ],
     [ '0.00003650', '16559.00000000', [] ],
     [ '0.00003666', '1116.00000000', [] ],
     [ '0.00003688', '1487.00000000', [] ],
     [ '0.00003690', '6828.00000000', [] ],
     [ '0.00003697', '1000.00000000', [] ],
     [ '0.00003700', '6220.00000000', [] ],
     [ '0.00003710', '1000.00000000', [] ],
     [ '0.00003720', '753.00000000', [] ],
     [ '0.00003730', '1000.00000000', [] ],
     [ '0.00003745', '10811.00000000', [] ],
     [ '0.00003750', '1500.00000000', [] ],
     [ '0.00003777', '6708.00000000', [] ],
     [ '0.00003800', '4594.00000000', [] ],
     [ '0.00003829', '500.00000000', [] ],
     [ '0.00003850', '10247.00000000', [] ],
     [ '0.00003878', '8588.00000000', [] ],
     [ '0.00003880', '3987.00000000', [] ],
     [ '0.00003888', '61016.00000000', [] ],
     [ '0.00003890', '485.00000000', [] ],
     [ '0.00003900', '1402.00000000', [] ],
     [ '0.00003924', '23167.00000000', [] ],
     [ '0.00003950', '2999.00000000', [] ],
     [ '0.00003987', '100.00000000', [] ],
     [ '0.00003989', '7579.00000000', [] ],
     [ '0.00003999', '1299.00000000', [] ],
     [ '0.00004000', '58771.00000000', [] ],
     [ '0.00004005', '3687.00000000', [] ] ] }
```
</details>

#### Placing a LIMIT order
```javascript
var quantity = 1, price = 0.069;
binance.buy("ETHBTC", quantity, price);
binance.sell("ETHBTC", quantity, price);
```

#### Placing a MARKET order
```javascript
// These orders will be executed at current market price.
var quantity = 1;
binance.buy("BNBBTC", quantity, 0, {type:"MARKET"})
binance.sell("ETHBTC", quantity, 0, {type:"MARKET"});
```

#### Placing a STOP LOSS order
```javascript
// When the stop is reached, a stop order becomes a market order
let symbol = "ETHBTC";
let quantity = 1;
let price = 0.069;
let stopPrice = 0.068;
binance.sell("ETHBTC", quantity, price, {stopPrice: stopPrice});
```

#### Placing an ICEBERG order
```javascript
// Iceberg orders are intended to conceal the order quantity.
var symbol = "ETHBTC";
var quantity = 1;
var price = 0.069;
binance.sell("ETHBTC", quantity, price, {icebergQty: 10});
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
<details>
 <summary>View Response</summary>

```js
[ { id: 9572,
    orderId: 47884,
    price: '0.00003701',
    qty: '1467.00000000',
    commission: '0.06774660',
    commissionAsset: 'BNB',
    time: 1507062500456,
    isBuyer: true,
    isMaker: true,
    isBestMatch: true },
  { id: 9575,
    orderId: 47884,
    price: '0.00003701',
    qty: '735.00000000',
    commission: '0.03394257',
    commissionAsset: 'BNB',
    time: 1507062502528,
    isBuyer: true,
    isMaker: true,
    isBestMatch: true } } ]
```
</details>

#### Get all account orders; active, canceled, or filled.
```javascript
binance.allOrders("ETHBTC", function(orders) {
	console.log(orders);
});
```

### Getting 24hr ticker price change statistics for a symbol
```javascript
binance.prevDay("BNBBTC",function(prevDay) {
	console.log("prevDay()", prevDay);
	console.log("BNB change since yesterday: "+prevDay.priceChangePercent+"%")
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

#### Get Candlestick Updates via WebSocket
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

Visit the Binance API documentation at https://www.binance.com/restapipub.html
