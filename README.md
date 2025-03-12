## Phoenix async

This is a small library that help use phoenix in an async js environment.

Promise push example (live view hook):

```js

import { promise_push } from "async_phoenix"

const myhook = {
    async mounted() {
        this.push = promise_push(this)
        this.el.addEventListener("click", this.handler.bind(this))
    }
    async handler() {
        // this is equivalent to 
        // this.pushEvent("some_phoenix_event", {params}, () => console.log("after event"))

        let response = await this.push("some_phoenix_event", {params})
        console.log("after event")
    }
}

```
