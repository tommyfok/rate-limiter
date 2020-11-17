const RL = require('./index');
const rl = new RL({
  time: 100,
  limit: 100,
});
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const totalCheckCount = 80000;
const keyword = 'test';

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
}


(async function () {
  const now = Date.now();
  const checkCount = Math.floor(totalCheckCount / (numCPUs + 1));
  let allowCount = 0;

  for (let i = 0; i < checkCount; i++) {
    // const checkTime = Date.now();
    const allow = await rl.check(keyword);
    if (allow === true) {
      allowCount += 1;
    }
  }

  const diffMs = Date.now() - now;
  console.log(`check keyword '${keyword}' ${checkCount} times, use ${(diffMs / checkCount).toFixed(4)}ms per check, ${diffMs}ms total, ${allowCount} allowed, this is ${cluster.isMaster ? 'master' : 'worker'}`);
}());
