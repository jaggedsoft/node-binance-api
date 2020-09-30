module.exports = {
    configureWebpack: {
        node: {
            fs: "empty",
            dgram: "empty",
            net: 'empty',
            tls: 'empty',
            dns: 'empty'
        }
    }
}
