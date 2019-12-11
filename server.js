const os = require('os')
const net = require('net')
const fs = require('fs')
const fnNull = () => {}

class SimpleServer {
    constructor({
        path,
        ondata = fnNull,
        onlisten = fnNull
    }) {
        this.clients = []
        this.server = net.createServer()
        this.server.on('connection', socket => {
            this.clients.push(socket)
            socket.on('data', data => {
                let sw = socket.write
                socket.write = function(data, ...args) {
                    sw.apply(this, [JSON.stringify(data)].concat(args))
                }
                ondata(JSON.parse(data), socket)
            })
        })
        this.server.listen(path, () => {
            console.log('server is listening on ', this.server.address())
            onlisten()
        })
    }
}

module.exports = SimpleServer
