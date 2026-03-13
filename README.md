## Phoenix async

NOTE: This is a very small library you might prefer to include in your project
directly and tune it to your liking. It is intentionally minimal.

This is a small library that help use phoenix channels and socket with promise.

Channel example:

```js

import { Socket, Channel } from "async_phoenix"

let s = new Socket("/mysocket");
await s.connect();

let c = s.channel("mychannel", { params..});

await c.join();
let response = await c.push("myevent", { data });
await c.leave();
await s.disconnect();

```
