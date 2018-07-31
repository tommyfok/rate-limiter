# rate-limiter
> A node rate limiter with cluster support

## install
```bash
tnpm i -S @tencent/rate-limiter
```

## use
```javascript
const limitKey = 'testkey'
const RL = require('@tencent/rate-limiter')
const rl = new RL({
    time: 100, // ms
    limit: 200,
    key: limitKey
})

rl.check().then(pass => {
    if (pass === true) {
        console.log('"${limitKey}" is not limited')
    } else {
        console.log('"${limitKey}" is limited')
    }
}).catch(e => console.log)
```
