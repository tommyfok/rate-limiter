const net = require('net')
const fnNull = () => {}

class SimpleConnect {
    constructor({
        path = './tmp-server',
        ondata = fnNull
    }) {
        this.connected = false
        this.client = net.connect(path, () => {
            this.connected = true
        })
        this.client.on('data', ondata)
    }
    send(data, end) {
        this.client[end ? 'end' : 'write'](data)
    }
}

module.exports = SimpleConnect
