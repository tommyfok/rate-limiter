# rate-limiter
> A node rate limiter with cluster support

## install
```bash
tnpm i -S @tencent/rate-limiter
```

## use
```javascript
const RL = require('@tencent/rate-limiter')
const rl = new RL({
    time: 100, // ms
    limit: 200
})

rl.check('your_key_to_check').then(pass => {
    if (pass === true) {
        console.log('not limited')
    } else {
        console.log('limited key: "your_key_to_check"')
    }
}).catch(e => console.log)
```
