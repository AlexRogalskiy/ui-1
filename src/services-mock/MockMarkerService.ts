import _ from "the-lodash"
import { Promise } from 'the-promise'

import { v4 as uuid } from 'uuid';

import { COLORS, SHAPES } from '../boot/markerData'

import { RemoteTrack } from '@kubevious/ui-framework/dist/remote-track'
import { ISharedState } from '@kubevious/ui-framework'

import { getRandomDnList } from './utils';
import { MockRootApiService } from './MockRootApiService';

import { IMarkerService } from '@kubevious/ui-middleware'
import { MarkerConfig, MarkerListItem, MarkerResult, MarkerResultSubscriber, MarkersExportData, MarkersImportData, MarkerStatus } from "@kubevious/ui-middleware/dist/services/marker"

const MOCK_MARKERS_ARRAY : any[] = []

for (let i = 0; i < 30; i++) {
    MOCK_MARKERS_ARRAY.push({
        name: 'marker-' + (i + 1).toString(),
        shape: SHAPES[i % SHAPES.length],
        color: COLORS[i % COLORS.length],
        items: [],
        logs: [],
        is_current: (Math.random() * 10 % 2 === 0),
    })
}

export let MOCK_MARKERS = _.makeDict(MOCK_MARKERS_ARRAY, x => x.name, x => x);

export class MockMarkerService implements IMarkerService {

    private parent: MockRootApiService;
    private sharedState : ISharedState;
    private _remoteTrack : RemoteTrack;

    private _allItemsSubscribers : Record<string, (items: MarkerStatus[]) => void> = {}
    private _itemResultSubscribers : Record<string, { name: string | null, cb: (result: MarkerResult) => void }> = {}

    private _timer : NodeJS.Timeout | null;

    constructor(parent: MockRootApiService, sharedState: ISharedState)
    {
        this.parent = parent;
        this.sharedState = sharedState;
        this._remoteTrack = new RemoteTrack(sharedState)
        
        this._notifyMarkers();

        this._timer = setInterval(() => {

            for (const marker of _.values(MOCK_MARKERS)) {
                const dnList = getRandomDnList();
                marker.items = dnList.map(x => ({
                    dn: x,
                }));
            }

            this._notifyMarkers();

        }, 5000);

    }

    close()
    {
        this._allItemsSubscribers = {}
        this._itemResultSubscribers = {}
        if (this._timer)
        {
            clearInterval(this._timer);
            this._timer = null;
        }
    }

    private _notifyMarkers() {
        const id = new Date().toISOString();

        this._remoteTrack.start({
            id: id,
            method: 'GET',
            url: '/',
            headers: {}
        })

        {
            const results = this._getItemStatuses();
            for(let x of _.values(this._allItemsSubscribers))
            {
                x(results);
            }
        }
        
        for(let resultSubscriber of _.values(this._itemResultSubscribers))
        {
            if (resultSubscriber.name)
            {
                const result = this._getItemResult(resultSubscriber.name);
                resultSubscriber.cb(result!);
            }
        }

        setTimeout(() => {
            this._remoteTrack.finish({
                id: id,
                method: 'GET',
                url: '/',
                headers: {}
            }, {});
        }, 1000)
    }

    getList() : Promise<MarkerListItem[]> {
        const allMarkers = _.values(MOCK_MARKERS);
        const list = allMarkers.map(x => {
            const item : MarkerListItem = {
                name: x.name,
                shape: x.shape,
                color: x.color
            }
            return item;
        });

        return Promise.timeout(100).then(() => list);
    }

    getItem(name: string) : Promise<MarkerConfig | null> {
        return Promise.timeout(500).then(() => {
            let innerMarker = MOCK_MARKERS[name];
            if (!innerMarker) {
                return null;
            }

            const item : MarkerConfig = {
                name: innerMarker.name,
                shape: innerMarker.shape,
                color: innerMarker.color,
                propagate: false
            }
            return item;
        });
    }

    createItem(config: MarkerConfig, name: string) : Promise<any>
    {
        const marker = _.clone({ ...config, items: [], logs: [] });

        delete MOCK_MARKERS[name]

        MOCK_MARKERS[marker.name] = marker

        this._notifyMarkers();

        return Promise.resolve();
    }

    deleteItem(name: string) : Promise<void>
    {
        delete MOCK_MARKERS[name];

        this._notifyMarkers();

        return Promise.resolve();
    }

    exportItems() : Promise<MarkersExportData>
    {
        const internalMarkers = _.cloneDeep(_.values(MOCK_MARKERS));
        const data : MarkerConfig[] = internalMarkers.map(x => ({
            name: x.name,
            shape: x.shape,
            color: x.color,
            propagate: false
        }));

        const response : MarkersExportData = {
            kind: 'markers',
            items: data,
        }

        return Promise.resolve(response);
    }

    importItems(data: MarkersImportData) : Promise<void>
    {
        if (data.deleteExtra) {
            MOCK_MARKERS = {};
        }

        for (const config of data.data.items) {
            const item = _.clone({ ...config, items: [], logs: [] });
            MOCK_MARKERS[item.name] = item;
        }

        this._notifyMarkers();

        return Promise.resolve();
    }

    getItemStatuses() : Promise<MarkerStatus[]> {
        return Promise.timeout(100).then(() => this._getItemStatuses());
    }

    getItemResult(name: string) : Promise<MarkerResult> { //  | null
        return Promise.timeout(500).then(() => {
            return this._getItemResult(name)!
        });
    }

    subscribeItemStatuses(cb: (items: MarkerStatus[]) => void)
    {
        const id = uuid();
        this._allItemsSubscribers[id] = cb;

        cb(this._getItemStatuses());
    }

    subscribeItemResult(cb: (result: MarkerResult) => void) : MarkerResultSubscriber
    {
        const id = uuid();
        this._itemResultSubscribers[id] = {
            name: null,
            cb: cb
        };

        return {
            update: (name: string | null) => {

                if (this._itemResultSubscribers[id]) {
                    this._itemResultSubscribers[id].name = null;
                    if (name) {
                        this._itemResultSubscribers[id].name = name;

                        const result = this._getItemResult(name);
                        if (result) {
                            cb(result);
                        }
                    }
                }


            },
            close: () => {
                delete this._itemResultSubscribers[id];
            }
        }
    }


    private _getItemStatuses() : MarkerStatus[] {
        const allMarkers = _.values(MOCK_MARKERS);
        const list = allMarkers.map(x => {
            const item : MarkerStatus = {
                name: x.name,
                shape: x.shape,
                color: x.color,
                item_count: x.items.length
            }
            return item;
        });
        return list;
    }

    private _getItemResult(name: string) : MarkerResult | null
    {
        let innerMarker = MOCK_MARKERS[name];
        if (!innerMarker) {
            return null;
        }

        const item : MarkerResult = {
            name: innerMarker.name,
            items: innerMarker.items.map(x => {
                return {
                    dn: x.dn
                }
            })
        }

        return item;
    }

}
