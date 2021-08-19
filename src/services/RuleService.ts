import _ from 'the-lodash';
import { Promise } from 'the-promise'

import { IRuleService } from '@kubevious/ui-middleware';

import { BaseService } from './BaseService'
import { RuleConfig, RuleListItem, RuleResult, RuleResultSubscriber, RulesExportData, RulesImportData, RuleStatus } from '@kubevious/ui-middleware/dist/services/rule';

export class RuleService extends BaseService implements IRuleService {

    getList() : Promise<RuleListItem[]>
    {
        return this.client
            .get<RuleListItem[]>("/rules")
            .then((result) => result.data);
    }

    getItem(name: string) : Promise<RuleConfig | null>
    {
        return this.client
            .get<RuleConfig | null>("/rule", { rule: name })
            .then((result) => result.data);
    }

    createItem(config: RuleConfig, name: string) : Promise<RuleConfig>
    {
        return this.client
            .post<RuleConfig>("/rule", { rule: name }, config)
            .then((result) => {
                return result.data;
            });
    }    
    
    deleteItem(name: string) : Promise<void>
    {
        return this.client
            .delete("/rule", { rule: name })
            .then((result) => {
                return result.data;
            });
    }    
    
    exportItems() : Promise<RulesExportData>
    {
        return this.client
            .get<RulesExportData>("/export-rules")
            .then((result) => result.data);
    }    
    
    importItems(data: RulesImportData) : Promise<void>
    {
        return this.client
            .post("/import-rules", { }, data)
            .then((result) => {
                return result.data
            });
    }    
    
    getItemStatuses() : Promise<RuleStatus[]>
    {
        return this.client
            .get<RuleStatus[]>("/rules-statuses")
            .then((result) => result.data);
    }    
    
    getItemResult(name: string) : Promise<RuleResult>
    {
        return this.client
            .get<RuleResult>("/rule-result", { rule: name })
            .then((result) => result.data);
    }    

    subscribeItemStatuses(cb: ((items: RuleStatus[]) => void)): void
    {
        this.socket.subscribe({ kind: 'rules-statuses' }, (value) => {
            cb(value);
        })
    }

    subscribeItemResult(cb: ((result: RuleResult) => void)): RuleResultSubscriber
    {
        const wsScope = this.socket.scope((value, target) => {
            cb(value);
        });

        return {
            update: (name: string | null) => {

                if (name) {
                    wsScope.replace([{   
                        kind: 'rule-result',
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
