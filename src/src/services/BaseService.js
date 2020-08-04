class BaseService {
    constructor(client, sharedState, socket)
    {
        this._client = client;
        this._sharedState = sharedState;
        this._socket = socket;

        if (!this.client) {
            throw new Error("Client not provided");
        }
        if (!this.sharedState) {
            throw new Error("SharedState not provided");
        }
        if (!this.socket) {
            throw new Error("Socket not provided");
        }

        this._socketHandlers = [];
        this._socketScopes = [];
    }

    get client() {
        return this._client;
    }

    get sharedState() {
        return this._sharedState;
    }

    get socket() {
        return this._socket;
    }

    close()
    {
        for(var handler of this._socketHandlers)
        {
            handler.stop();
        }
        for(var scope of this._socketScopes)
        {
            scope.close();
        }
    }

    _socketSubscribe(target, cb)
    {
        var handler = this.socket.subscribe(target, cb);
        this._socketHandlers.push(handler);
        return handler;
    }

    _socketScope(cb)
    {
        var scope = this.socket.scope(cb);
        this._socketScopes.push(scope);
        return scope;
    }
}

export default BaseService
