// read file test
const fs = require('fs')
const net = require('net')
const os = require('os')
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

        let ipcPath = options.ipcPath
        // 争夺本地文件资源，抢占master身份
        let creatingFilePath = `${ipcPath}-creating`
        let createdFilePath = `${ipcPath}-created`

        let isWorker = fs.existsSync(creatingFilePath)
        if (isWorker) {
            this.isMaster = false
            this.resolvers = {}
            let createClient = () => {
                let isMasterReady = fs.existsSync(createdFilePath)
                if (isMasterReady) {
                    this.client = new Client({
                        path: ipcPath,
                        onready: () => {
                            this.ready = true
                            realOpts.onready(this.client)
                            console.log('client is connected to server', ipcPath)
                        },
                        ondata: data => {
                            // 如果data符合格式
                            // 那么从中获取结果
                            if (data.action === 'CALL_MASTER_CHECK_RESULT') {
                                _finishCheck.call(this, data.uuid, data.result)
                            }
                        },
                        onerror: err => {
                            console.log('client error', err.message)
                        }
                    })
                } else {
                    console.log('server not ready, wait 100ms')
                    setTimeout(createClient, 100);
                }
            }
            createClient()
        } else {
            this.cache = {}
            this.isMaster = true
            fs.writeFileSync(creatingFilePath, '1')
            this.server = new Server({
                path: ipcPath,
                ondata: (data, socket) => {
                    // 如果data符合格式
                    // 那么给socket发送结果
                    if (data.action === 'CALL_MASTER_CHECK') {
                        socket.write({
                            action: 'CALL_MASTER_CHECK_RESULT',
                            result: _masterCheck.call(this, data.key, data.timestamp),
                            uuid: data.uuid
                        })
                    }
                },
                onlisten: () => {
                    fs.writeFileSync(createdFilePath, '1')
                    this.ready = true
                    realOpts.onready(this.server)
                }
            })
        }
    }

    check(key) {
        key = key || this.key
        if (this.isMaster) {
            return new Promise(resolve => {
                resolve(_masterCheck.call(this, key, Date.now()))
            })
        } else {
            let uuid = uuidv4()
            _callMasterCheck.call(this, key, uuid)
            return new Promise(resolve => {
                this.resolvers[uuid] = resolve
            })
        }
    }
}

module.exports = RateLimiter

function _finishCheck(uuid, result) {
    let resolver = this.resolvers[uuid]
    if (resolver) {
        resolver(result)
    } else {
        console.log('no resolver to finish check', this.resolvers, uuid)
    }
    delete this.resolvers[uuid]
}

function _callMasterCheck(key, uuid) {
    if (!this.ready) {
        throw 'Rate Limiter Not Ready'
    }
    this.client.send({
        key,
        uuid,
        now: Date.now(),
        action: 'CALL_MASTER_CHECK'
    })
}

function _masterCheck(key, now) {
    this.cache[key] = this.cache[key] || []
    let list = this.cache[key].filter(ts => ts && (ts > (now - this.time)))
    this.cache[key] = list
    let allow = list.length < this.limit
    if (allow) {
        list.push(now)
    }
    return allow
}
