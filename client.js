const net = require('net')
const fnNull = () => {}

class SimpleConnect {
    constructor({
        path = './tmp-server',
        ondata = fnNull,
        onerror = fnNull,
        onready = fnNull
    }) {
        this.connected = false
        this.client = net.connect(path, () => {
            this.connected = true
            onready(this.client)
        })
        this.client.on('data', data => {
            ondata(JSON.parse(data))
        })
        this.client.on('error', onerror)
    }
    send(data, end) {
        this.client[end ? 'end' : 'write'](JSON.stringify(data))
    }
}

module.exports = SimpleConnect
