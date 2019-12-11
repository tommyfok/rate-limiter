const RL = require('./index')
const cluster = require('cluster')
const fs = require('fs')
const os = require('os')
const numCPUs = os.cpus().length
const totalCheckCount = 80000
const keyword = 'hehe, another'
const uuidv4 = require('uuid/v4')
let rl

try {
    fs.unlinkSync('./ipc-tmp-path-name')
} catch (e) {}

if (cluster.isMaster) {
    console.log(`CPU总数${numCPUs}`)
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork()
    }
} else {
    rl = new RL({
        time: 3000,
        limit: 10,
        ipcPath: 8899,
        // onready: test
        onready: singleTest
    })
}

let nnn = Date.now()
async function singleTest() {
    let pass = await rl.check(keyword)
    if (pass) {
        let wid
        if (cluster.isWorker) {
            wid = cluster.worker.id
        }
        console.log(`+${Date.now() - nnn}ms`, pass, wid)
    }
    setTimeout(singleTest, Math.random() * 100)
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
