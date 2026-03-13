import * as Phx from "phoenix";

function debug(ctx, msg, data) {
    let a = null;
    if (msg && msg.message) {
        a = msg.message;
    } else if (typeof msg === "string") {
        a = msg;
    } else {
        a = "";
    }
    let b = null;
    if (data && data.message) {
        b = data.message;
    } else if (typeof data === "string") {
        b = data;
    } else {
        b = "";
    }
    console.debug(`[${ctx}] ${a} ${b}`);
}

export class Socket {
    constructor(path, options) {
        options ||= {};
        options.logger ||= debug;
        if (options.longPoll) {
            options.transport = Phx.LongPoll;
        }
        this.socket = new Phx.Socket(path, options);
    }

    async disconnect() {
        const promise = new Promise((resolve, reject) => {
            this.socket.disconnect(() => resolve(true));
        });
        return promise;
    }

    async connect() {
        const promise = new Promise((resolve, reject) => {
            const off = () => {
                if (this.onConnectSuccessRef)
                    this.socket.off(this.onConnectSuccessRef);
                if (this.onConnectErrorRef)
                    this.socket.off(this.onConnectErrorRef);
                this.onConnectSuccessRef = null;
                this.onConnectErrorRef = null;
            };
            this.onConnectSuccessRef = this.socket.onOpen(() => {
                off();
                resolve(true);
            });
            this.onConnectErrorRef = this.socket.onError((err) => {
                off();
                reject(err);
            });
            this.socket.connect();
        });
        return promise;
    }

    channel(name, params) {
        return new Channel(this.socket.channel(name, params));
    }
}

class Channel {
    constructor(phx_channel) {
        this.error = null;
        this.channel = phx_channel;
        this.channel.onError((e) => {
            throw new Error("Channel communication error");
        });
        this.on = this.channel.on.bind(this.channel);
    }

    async join(timeout) {
        return new Promise((resolve, reject) => {
            this.channel
                .join(timeout)
                .receive("ok", (r) => {
                    resolve(r);
                })
                .receive("error", (e) => {
                    this.channel.leave();
                    reject(e.reason);
                });
        });
    }

    async push(evt, data) {
        return new Promise((resolve, reject) => {
            if (this.error) {
                return reject(this.error);
            }
            this.channel
                .push(evt, data)
                .receive("ok", (r) => {
                    resolve(r);
                })
                .receive("error", (e) => {
                    reject(new Error(e));
                });
        });
    }

    async leave() {
        return new Promise((resolve, reject) => {
            this.channel.leave().receive("ok", () => resolve());
        });
    }
}
