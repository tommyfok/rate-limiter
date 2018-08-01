// read file test
const fs = require('fs')
const net = require('net')
const cluster = require('cluster')
const uuidv4 = require('uuid/v4')

// 默认每秒100次的限制
class RateLimiter {
    constructor(options = {}) {
        if (options.limit > 10000) {
            throw 'RateLimiter: limit too large, max value is 10000'
        }

        if (options.time > 24 * 3600 * 1000) {
            throw 'RateLimiter: time too large, max value is 86400000'
        }

        let realOpts = Object.assign({
            time: 1000,
            limit: 1000
        }, options)

        this.time = realOpts.time
        this.limit = realOpts.limit
        this.key = realOpts.key

        // 争夺本地文件资源，抢占master身份
        let filePath = './master-agent-id'
        let ipcPath = './master-agent'
        let isWorker = fs.existsSync(filePath)
        if (isWorker) {
            // worker就直接连接到server吧
            this.client = net.createConnection(ipcPath, () => {
                console.log('client connected to server!!!')
            })
            this.client.on('data', data => {
                console.log(data.toString())
            })
        } else {
            fs.writeFileSync(filePath, cluster.worker.id)
            // master需要起一个服务，监听一个ipc文件
            this.server = net.createServer()
            this.server.listen(ipcPath, () => {
                console.log(`listening on ${ipcPath}`)
            })
            this.server.on('data', data => {
                console.log('来数据了！', data.toString())
            })
        }
    }

    check(key) {
        return true
    }
}

module.exports = RateLimiter
