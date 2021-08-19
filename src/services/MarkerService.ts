import _ from 'the-lodash';
import { Promise } from 'the-promise'

import { BaseService } from './BaseService'

import { IMarkerService } from '@kubevious/ui-middleware';
import { MarkerConfig, MarkerListItem, MarkerResult, MarkerResultSubscriber, MarkersExportData, MarkersImportData, MarkerStatus } from '@kubevious/ui-middleware/dist/services/marker';

export class MarkerService extends BaseService implements IMarkerService {

    getList(): Promise<MarkerListItem[]>
    {
        return this.client
            .get<MarkerListItem[]>("/markers")
            .then((result) => result.data);
    }

    getItem(name: string): Promise<MarkerConfig | null>
    {
        return this.client
            .get<MarkerConfig | null>("/marker", { marker: name })
            .then((result) => result.data);
    }

    createItem(config: MarkerConfig, name: string): Promise<MarkerConfig>
    {
        return this.client
            .post<MarkerConfig>("/marker", { marker: name }, config)
            .then((result) => {
                return result.data;
            });
    }
    
    deleteItem(name: string): Promise<void>
    {
        return this.client
            .delete("/marker", { marker: name })
            .then((result) => {
                return result.data;
            });
    }
    
    exportItems(): Promise<MarkersExportData>
    {
        return this.client
            .get<MarkersExportData>("/export-markers")
            .then((result) => result.data);
    }

    importItems(data: MarkersImportData): Promise<void>
    {
        return this.client
            .post("/import-markers", { }, data)
            .then((result) => {
                return result.data
            });
    }

    getItemStatuses(): Promise<MarkerStatus[]>
    {
        return this.client
            .get<MarkerStatus[]>("/marker-statuses")
            .then((result) => result.data);
    }

    getItemResult(name: string): Promise<MarkerResult>
    {
        return this.client
            .get<MarkerResult>("/marker-result", { marker: name })
            .then((result) => result.data);
    }

    subscribeItemStatuses(cb: (items: MarkerStatus[]) => void): void
    {
        this.socket.subscribe({ kind: 'markers-statuses' }, (value) => {
            cb(value);
        })
    }

    subscribeItemResult(cb: (result: MarkerResult) => void): MarkerResultSubscriber
    {
        const wsScope = this.socket.scope((value, target) => {
            cb(value);
        });

        return {
            update: (name: string | null) => {

                if (name) {
                    wsScope.replace([{   
                        kind: 'marker-result',
                        name: name
                    }])
                } else {
                    wsScope.replace([])
                }

            },
            close: () => {
                wsScope.close();
            }
        }
    }

}
