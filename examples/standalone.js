// Standalone async functions not requiring the library
const axios = require( 'axios' );
async function bookTicker( symbol = false ) {
    return new Promise( ( resolve, reject ) => {
        params = symbol ? `?symbol=${symbol}` : '';
        axios.get( 'https://api.binance.com/api/v3/ticker/bookTicker' + params )
            .then( function ( response ) {
                resolve( response.data );
            } )
            .catch( function ( error ) {
                throw error;
            } );
    } );
}
//console.log(await bookTicker());
//console.log(await bookTicker("BTCUSDT"));
