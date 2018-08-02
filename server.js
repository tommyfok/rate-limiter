const net = require('net')
const fnNull = () => {}

class SimpleServer {
    constructor({
        path = './tmp-server',
        ondata = fnNull
    }) {
        this.clients = []
        this.server = net.createServer()
        this.server.on('connection', socket => {
            this.clients.push(socket)
            socket.on('data', data => {
                ondata(data, socket)
            })
        })
        this.server.listen(path, () => {
            console.log('server is listening on ', this.server.address())
        })
    }
}

module.exports = SimpleServer
