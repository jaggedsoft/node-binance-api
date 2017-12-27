## Advanced Examples

#### exchangeInfo(): Pull minimum order size, quantity, etc.
```js
//minQty = minimum order quantity
//minNotional = minimum order value (price * quantity)
binance.exchangeInfo(function(data) {
	let minimums = {};
	for ( let obj of data.symbols ) {
		let filters = {minNotional:0.001,minQty:1,maxQty:10000000,stepSize:1,minPrice:0.00000001,maxPrice:100000};
		for ( let filter of obj.filters ) {
			if ( filter.filterType == "MIN_NOTIONAL" ) {
				filters.minNotional = filter.minNotional;
			} else if ( filter.filterType == "PRICE_FILTER" ) {
				filters.minPrice = filter.minPrice;
				filters.maxPrice = filter.maxPrice;
			} else if ( filter.filterType == "LOT_SIZE" ) {
				filters.minQty = filter.minQty;
				filters.maxQty = filter.maxQty;
				filters.stepSize = filter.stepSize;
			}
		}
		minimums[obj.symbol] = filters;
	}
	console.log(minimums);
	fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
});
```
![example](https://image.ibb.co/bz5KAG/notationals.png)
