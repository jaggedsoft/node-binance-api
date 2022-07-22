const Binance = require( '../node-binance-api.js' )


const parseFuturesCandles = ( data ) => {
    const [ time, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBaseVolume, takerBuyQuoteVolume ] = data
    return {
        time,
        open,
        high,
        low,
        close,
        volume,
        closeTime,
        quoteVolume,
        trades,
        takerBuyBaseVolume,
        takerBuyQuoteVolume
    }
}

const sleep = async ( ms ) => {
    return new Promise( resolve => {
        setTimeout( resolve, ms )
    } )
}

const main = async () => {
    const binance = new Binance()

    const symbol = 'ETHUSDT'
    const interval = '1m'
    binance.futuresChart( symbol, interval, async ( symbol, interval, wsChart ) => {
        const candles = Object.values( wsChart ).reverse()
        const latestCandle = candles[0]
        if ( latestCandle.isFinal ) {
            console.log( 'Candle closed for', new Date( latestCandle.time ).toLocaleDateString() )
            // check with rest api if the candle values are identical
            // sleep a bit to give Binance servers some time to update their REST apis
            await sleep( 1000 )
            let restChart = await binance.futuresCandles( symbol, interval )
            restChart = restChart.map( parseFuturesCandles )

            let hasMismatch = false
            for ( const restKline of restChart ) {
                const wsKline = wsChart[restKline.time]
                if ( !wsKline ) {
                    console.log( restKline )
                    console.error( `WS Cache does not have kline for timestamp: ${ new Date( restKline.time ).toLocaleDateString() }` )
                    continue
                }

                if ( wsKline.isFinal ) {
                    // compare both now

                    for ( const key of Object.keys( restKline ) ) {
                        if ( key === 'isFinal' ) {
                            continue
                        }
                        const restValue = restKline[key]
                        const wsValue = wsKline[key]
                        if ( restValue !== wsValue ) {
                            console.log( `"${ key }" mismatch: ${ restValue }  and ${ wsValue }` )
                            hasMismatch = true
                        }
                    }
                }
            }
            if ( !hasMismatch ) {
                console.log( '-- REST and WS in sync' )
            }

        }
    } )

}

main()

