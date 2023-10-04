module.exports = class WsResponse {
    event = ""
    payload = []
    status = 0
    constructor(event, payload, status) {
        this.event = event;
        this.payload = payload;
        this.status = status;
    }

    getEvent() {
        return this.event;
    }
    getPayload() {
        return this.payload;
    }
    getStatus() {
        return this.status;
    }

    toJsonObject() {
        return {
            event: this.event,
            payload: this.payload,
            status: this.status,
        }
    }

    toJsonString() {
        return JSON.stringify(this.toJsonObject());
    }
}