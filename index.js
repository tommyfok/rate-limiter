// read file test
const fs = require('fs')
const cluster = require('cluster')
const uuidv4 = require('uuid/v4')
const Taf = require('@tencent/taf-rpc')

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

        if (process.env.TAF_CONF) {
            // taf
            Taf.server.getServant(process.env.TAF_CONF).forEach(config => {
                console.log('SERVANT____INFO____', config)
                if (config.servant === 'WWW.WebLubanServer.RateLimitObj') {
                    this.limiterPort = +config.endpoint.split(' -p ')[1].split(' -t ')[0]
                }
            })
        } else {
            // 本地，随便写的端口
            this.limiterPort = 8707
        }

        let fpath = './master-worker-id'
        if (fs.existsSync(fpath)) {
            // 未争夺到资源，那就是worker了
            this.server = 
        } else {
            // 争夺资源
            fs.writeFileSync(fpath, cluster.worker.id)
            this.server = net.createServer(client => {
                console.log('client connected')
            })
            this.server.listen(this.limiterPort, () => {
                console.log('limiter server bound')
            })
        }
    }

    check(key) {
        key = key || this.key
        if (this.mainWorkerId) {
            // 代理master模式
            if (this.mainWorkerId == cluster.worker.id) {
                // 本进程就是代理master
                return new Promise(resolve => {
                    resolve(_masterCheck.call(this, key, Date.now()))
                })
            } else {
                // 发送消息到代理master
                let checkId = uuidv4()
                _callMasterCheck(key, checkId, cluster.workers[this.mainWorkerId])
                return new Promise(resolve => {
                    this.resolvers[checkId] = resolve
                })
            }
        } else {
            if (cluster.isMaster) {
                return new Promise(resolve => {
                    resolve(_masterCheck.call(this, key, Date.now()))
                })
            } else {
                let checkId = uuidv4()
                _callMasterCheck(key, checkId)
                return new Promise(resolve => {
                    this.resolvers[checkId] = resolve
                })
            }
        }
    }
}

module.exports = RateLimiter

function _finishCheck(checkId, result) {
    let resolver = this.resolvers[checkId]
    if (resolver) {
        resolver(result)
    } else {
        console.log('no resolver to finish check')
    }
    delete this.resolvers[checkId]
}

function _callMasterCheck(key, checkId, p = process) {
    p.send({
        key,
        checkId,
        now: Date.now(),
        action: '_masterCheck'
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