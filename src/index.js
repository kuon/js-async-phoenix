import * as Phx from "phoenix"

function debug(ctx, msg, data) {
    let a = null
    if (msg && msg.message) {
        a = msg.message
    } else if (typeof msg === "string") {
        a = msg
    } else {
        a = ""
    }
    let b = null
    if (data && data.message) {
        b = data.message
    } else if (typeof data === "string") {
        b = data
    } else {
        b = ""
    }
    console.debug(`[${ctx}] ${a} ${b}`)
}

export function promise_push(hook) {
    return async (...args) => {
        return new Promise((resolve, reject) => {
            try {
                if (args.length == 1) {
                    hook.pushEvent(args[0], {}, (data, ref) => {
                        resolve(data)
                    })
                } else if (args.length == 2) {
                    hook.pushEvent(args[0], args[1], (data, ref) => {
                        resolve(data)
                    })
                } else if (args.length == 3) {
                    hook.pushEventTo(args[0], args[1], args[2], (data, ref) => {
                        resolve(data)
                    })
                }
            } catch (e) {
                reject(new Error(e.reason))
            }
        })
    }
}

export class Socket {
    constructor(path, options) {
        options ||= {}
        options.logger ||= debug
        this.socket = new Phx.Socket(path, options)
    }

    async disconnect() {
        const promise = new Promise((resolve, reject) => {
            this.socket.disconnect(() => resolve(true))
        })
        return promise
    }

    async connect() {
        const promise = new Promise((resolve, reject) => {
            const off = () => {
                if (this.onConnectSuccessRef)
                    this.socket.off(this.onConnectSuccessRef)
                if (this.onConnectErrorRef)
                    this.socket.off(this.onConnectErrorRef)
                this.onConnectSuccessRef = null
                this.onConnectErrorRef = null
            }
            this.onConnectSuccessRef = this.socket.onOpen(() => {
                off()
                resolve(true)
            })
            this.onConnectErrorRef = this.socket.onError((err) => {
                off()
                reject(err)
            })
            this.socket.connect()
        })
        return promise
    }

    channel(name, params) {
        return new Channel(this.socket.channel(name, params))
    }
}

class Channel {
    constructor(phx_channel) {
        this.channel = phx_channel
        this.on = this.channel.on.bind(this.channel)
    }

    async join(timeout) {
        return new Promise((resolve, reject) => {
            this.channel
                .join(timeout)
                .receive("ok", resolve)
                .receive("error", (e) => {
                    this.channel.leave()
                    reject(e.reason)
                })
        })
    }

    async push(event, data) {
        return new Promise((resolve, reject) => {
            const err_ref = this.channel.onError((e) => {
                try {
                    this.channel.off(err_ref)
                } catch (e) {}
                reject(new Error("channel error"))
            })
            this.channel
                .push(event, data)
                .receive("ok", (r) => {
                    try {
                        this.channel.off(err_ref)
                        resolve(r)
                    } catch (e) {
                        reject(new Error(e.reason))
                    }
                })
                .receive("error", (e) => {
                    try {
                        this.channel.off(err_ref)
                    } catch (e) {}
                    reject(new Error(e))
                })
        })
    }
}
