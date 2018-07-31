// read file test
const fs = require('fs')
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

        if (cluster.isMaster) {
            this.cache = {}
            cluster.on('message', (worker, message) => {
                if (message.action === '_masterCheck') {
                    let ctx = this
                    worker.send({
                        result: _masterCheck.call(ctx, message.key, message.now),
                        checkId: message.checkId,
                        action: '_checkDone'
                    })
                }
            })
        } else {
            this.resolvers = {}
            process.on('message', message => {
                if (message.action === '_checkDone') {
                    _finishCheck.call(this, message.checkId, message.result)
                }
            })
        }
    }

    check(key) {
        key = key || this.key
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

function _callMasterCheck(key, checkId) {
    process.send({
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
