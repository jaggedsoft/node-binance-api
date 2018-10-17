global.ticker = {};
global.balance = {};
global.minimums = {};
// Get exchangeInfo on startup
//minNotional = minimum order value (price * quantity)
binance.exchangeInfo((error, data) => {
	if ( error ) console.error(error);
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
	//console.log(minimums);
	global.minimums = minimums;
	//fs.writeFile("json/minimums.json", JSON.stringify(minimums, null, 4), (err)=>{});

	// Get ticker prices
	binance.prices((error, ticker) => {
		if ( error ) console.error(error);
		for ( let symbol in ticker ) {
			global.ticker[symbol] = parseFloat(ticker[symbol]);
		}
                // Get balance on a timer every 5 seconds
		setInterval(function(){ balance(); }, 5000);
		balance();
	});
});

// Get your balances
function balance() {
	binance.balance((error, balances) => {
		if ( error ) console.error(error);
		let btc = 0.00;
		for ( let asset in balances ) {
			let obj = balances[asset];
			obj.available = parseFloat(obj.available);
			//if ( !obj.available ) continue;
			obj.onOrder = parseFloat(obj.onOrder);
			obj.btcValue = 0;
			obj.btcTotal = 0;
			if ( asset == 'BTC' ) obj.btcValue = obj.available;
			else if ( asset == 'USDT' ) obj.btcValue = obj.available / global.ticker.BTCUSDT;
			else obj.btcValue = obj.available * global.ticker[asset+'BTC'];
			if ( asset == 'BTC' ) obj.btcTotal = obj.available + obj.onOrder;
			else if ( asset == 'USDT' ) obj.btcTotal = (obj.available + obj.onOrder) / global.ticker.BTCUSDT;
			else obj.btcTotal = (obj.available + obj.onOrder) * global.ticker[asset+'BTC'];
			if ( isNaN(obj.btcValue) ) obj.btcValue = 0;
			if ( isNaN(obj.btcTotal) ) obj.btcTotal = 0;
			btc+= obj.btcTotal;
			global.balance[asset] = obj;
		}
		//fs.writeFile("json/balance.json", JSON.stringify(global.balance, null, 4), (err)=>{});
	});
}
