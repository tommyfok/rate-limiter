// read file test
const fs = require('fs')
const net = require('net')
const cluster = require('cluster')
const uuidv4 = require('uuid/v4')
const Client = require('./client')
const Server = require('./server')

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
        let filePath = './rate-limiter-tmp-server-id'
        let ipcPath = './rate-limiter-tmp-server'
        try {
            fs.unlinkSync(ipcPath)
        } catch (e) {
            console.log(e.message)
        }
        let isWorker = fs.existsSync(filePath)
        if (isWorker) {
        } else {
            fs.writeFileSync(filePath, cluster.worker.id)
            this.server = new Server(ipcPath, (data, socket) => {
                // 如果data符合格式
                // 那么给socket发送结果！
                let parsedData
                try {
                    parsedData = JSON.parse(data)
                    if (parsedData.action === 'CALL_MASTER_CHECK') {
                        socket.write(JSON.stringify({
                            action: 'CALL_MASTER_CHECK_RESULT',
                            result: _masterCheck(parsedData.key),
                            uuid: parsedData.key
                        }))
                    }
                } catch (e) {
                    console.log('data from client illegal', e.message)
                }
            })
        }
    }

    check(key) {
        return true
    }
}

module.exports = RateLimiter
