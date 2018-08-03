const RL = require('./index')
const cluster = require('cluster')
const fs = require('fs')
const numCPUs = require('os').cpus().length
const totalCheckCount = 80000
const keyword = 'hehe, another'
let rl

try {
    fs.unlinkSync('./rate-limiter-tmp-server-created')
    fs.unlinkSync('./rate-limiter-tmp-server-creating')
    fs.unlinkSync('./rate-limiter-tmp-server')
} catch(e) {}

if (cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork()
    }
}

rl = new RL({
    time: 5000,
    limit: 1,
    // onready: test
    onready: singleTest
})

let nnn = Date.now()
async function singleTest() {
    console.log(`+${Date.now() - nnn}ms`, await rl.check(keyword))
    setTimeout(singleTest, Math.random() * 1000)
}

async function test() {
    let now = Date.now()
    let checkCount = Math.floor(totalCheckCount / (numCPUs + 1))
    let allowCount = 0

    for (let i = 0; i < checkCount; i++) {
        let checkTime = Date.now()
        let allow = await rl.check(keyword)
        await smallDelay()
        if (allow === true) {
            allowCount++
        }
    }

    let diffMs = Date.now() - now
    console.log(`检查关键词 '${keyword}' ${checkCount} times, use ${(diffMs/checkCount).toFixed(4)}ms per check, ${diffMs}ms total, ${allowCount} allowed, this is ${cluster.isMaster?'master':'worker'}`)
}

function smallDelay() {
    return new Promise(res => {
        setTimeout(res)
    })
}
