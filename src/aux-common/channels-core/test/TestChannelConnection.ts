import { Observable, Subject } from "rxjs";
import { RealtimeChannelConnection } from "../RealtimeChannelConnection";
import { ConnectionEvent } from "../ConnectionEvent";

export interface TestChannelRequest {
    name: string;
    data: any;
    resolve: (response: any) => void;
    reject: (err: any) => void;
}

export class TestChannelConnection implements RealtimeChannelConnection {

    private _connectionStateChanged: Subject<boolean>;
    knownEventNames: string[];
    events: Subject<ConnectionEvent>;
    emitted: ConnectionEvent[];
    requests: TestChannelRequest[];
    
    _connected: boolean;
    closed: boolean;

    constructor() {
        this._connectionStateChanged = new Subject<boolean>();
        this.events = new Subject<ConnectionEvent>();
        this.emitted = [];
        this.requests = [];
        this._connected = false;
        this.closed = false;
    }

    get connected() {
        return this._connected;
    }

    setConnected(value: boolean) {
        if (value !== this.connected) {
            this._connected = value;
            this._connectionStateChanged.next(this._connected);
        }
    }

    init(knownEventNames: string[]): void {
        this.knownEventNames = knownEventNames;
    }

    isConnected(): boolean {
        return this._connected;
    }

    emit(event: ConnectionEvent): void {
        this.emitted.push(event);
    }

    request<TResponse>(name: string, data: any): Promise<TResponse> {
        return new Promise((resolve, reject) => {
            this.requests.push({
                name,
                data,
                resolve,
                reject
            });
        });
    }

    get connectionStateChanged() {
        return this._connectionStateChanged;
    }

    unsubscribe(): void {
        this.closed = true;
    }
}