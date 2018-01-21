// You can now pass useServerTime which synchronizes against the server's time
// Optionally pass a callback function to options() which runs after the synchronization is complete

binance.options({
	APIKEY: '<key>',
	APISECRET: '<secret>',
	useServerTime: true
}, main);

function main() {
	binance.balance((error, balances) => {
		if ( error ) {
			console.error(error);
			return;
		}
		console.log("balances()", balances);
		console.log("BNB balance: ", balances.BNB.available);
	});
}
