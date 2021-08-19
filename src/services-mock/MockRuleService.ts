import _ from "the-lodash"
import { Promise } from 'the-promise'

import { v4 as uuid } from 'uuid';

import { MOCK_MARKERS } from "./MockMarkerService"
import { MockRootApiService } from "./MockRootApiService"

import { RemoteTrack } from "@kubevious/ui-framework/dist/remote-track"
import { ISharedState } from "@kubevious/ui-framework"

import { getRandomDnList } from "./utils"

import { IRuleService } from "@kubevious/ui-middleware"
import { RuleConfig, RuleListItem, RuleResult, RuleResultSubscriber, RulesExportData, RulesImportData, RuleStatus } from "@kubevious/ui-middleware/dist/services/rule";

let MOCK_RULES_ARRAY : any[] = [
    {
        enabled: true,
        name: "rule 1",
        target: "target-1",
        script: "script-1",
    },
    {
        enabled: false,
        name: "rule 2",
        target: "target-2",
        script:
            "if (item.hasChild(\"Ingress\")) \n { \n \t if (item.config.spec.type == 'ClusterIP') \n \t{ \n \t\tfail('Use ClusterIP for Ingress exposed services'); \n \t } \n }",
    },
    {
        enabled: true,
        name: "rule 3",
        target: "target-3",
        script: "script-3",
    },
]
let MOCK_RULES = _.makeDict(MOCK_RULES_ARRAY, (x) => x.name, x => x)
for (const x of _.values(MOCK_RULES)) {
    x.items = []
    x.logs = []
    x.is_current = (Math.random() * 10) % 2 === 0
}

export class MockRuleService implements IRuleService {
    private parent: MockRootApiService
    private sharedState: ISharedState
    private _remoteTrack: RemoteTrack

    private _allItemsSubscribers : Record<string, (items: RuleStatus[]) => void> = {}
    private _itemResultSubscribers : Record<string, { name: string | null, cb: (result: RuleResult) => void }> = {}

    private _timer : NodeJS.Timeout | null;

    constructor(parent: MockRootApiService, sharedState: ISharedState) {
        this.parent = parent
        this.sharedState = sharedState
        this._remoteTrack = new RemoteTrack(sharedState)

        this._notifyRules()

        this._timer = setInterval(() => {
            for (const x of _.values(MOCK_RULES)) {
                x.is_current = true
                x.items = []
                x.logs = []
            }

            for (const rule of _.values(MOCK_RULES)) {
                if (rule.enabled) {
                    const hasError = Math.random() * 100 > 60
                    if (hasError) {
                        rule.logs = []
                        for (let i = 0; i < (Math.random() * 10) % 3; i++) {
                            rule.logs.push({
                                kind: "error",
                                msg: {
                                    source:
                                        i % 2 === 0 ? ["target"] : ["script"],
                                    msg: "This is error number " + i,
                                },
                            })
                        }
                    } else {
                        const dnList = getRandomDnList()
                        rule.items = dnList.map((x) => ({
                            dn: x,
                            id: Math.floor(Math.random() * 10),
                            errors: Math.floor(Math.random() * 10),
                            warnings: Math.floor(Math.random() * 10),
                            markers: [
                                _.sample(
                                    _.values(MOCK_MARKERS).map((x) => x.name)
                                ),
                            ],
                        }))
                    }
                }
            }

            this._notifyRules()
        }, 5000)

        this.sharedState.subscribe(
            "rule_editor_selected_rule_id",
            (rule_editor_selected_rule_id) => {
                this._notifyRuleStatus(rule_editor_selected_rule_id)
            }
        )
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

    private _notifyRules() {
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

    private _notifyRuleStatus(name: string) {
        const rule: any = MOCK_RULES[name]
        let data: any = null
        if (rule) {
            data = {
                name: rule.name,
                is_current: rule.is_current,
                error_count: rule.logs.length,
            }
            data.items = rule.items
            data.logs = rule.logs
        }
        this.sharedState.set("rule_editor_selected_rule_status", data)
    }

    private _makeRuleListItem(x) {
        if (!x) {
            return null
        }
        return {
            name: x.name,
            enabled: x.enabled,
            item_count: x.items.length,
            error_count: x.logs.length,
            is_current: x.is_current,
        }
    }

    private _makeRuleItem(x) {
        const item: any = this._makeRuleListItem(x)
        if (!item) {
            return null
        }
        item.script = x.script
        item.target = x.target
        item.enabled = x.enabled
        return item
    }

    getList() : Promise<RuleListItem[]> {
        const allRules = _.values(MOCK_RULES);
        const list = allRules.map(x => {
            const item : RuleListItem = {
                name: x.name,
                enabled: x.enabled
            }
            return item;
        });

        return Promise.timeout(100).then(() => list);
    }

    getItem(name: string) : Promise<RuleConfig | null>
    {
        return Promise.timeout(500).then(() => {
            let innerRule = MOCK_RULES[name];
            if (!innerRule) {
                return null;
            }

            const item : RuleConfig = {
                name: innerRule.name,
                script: innerRule.script,
                target: innerRule.target,
                enabled: innerRule.enabled,
            }

            return item;
        });
    }

    createItem(config: RuleConfig, name: string) : Promise<RuleConfig>
    {
        const rule = _.clone({ ...config, items: [], logs: [] })

        console.error('CREATEITEM', config, name)

        delete MOCK_RULES[name];

        MOCK_RULES[rule.name] = rule

        this._notifyRules();

        return Promise.resolve(config);
    }    

    deleteItem(name: string) : Promise<void>
    {
        delete MOCK_RULES[name];

        this._notifyRules();

        return Promise.resolve();
    }    

    exportItems() : Promise<RulesExportData>
    {
        const internalRules = _.cloneDeep(_.values(MOCK_RULES));
        const data : RuleConfig[] = internalRules.map(x => ({
            name: x.name,
            target: x.target,
            script: x.script,
            enabled: x.enabled
        }));


        const response : RulesExportData = {
            kind: 'rules',
            items: data,
        }

        return Promise.resolve(response);
    }    
    
    importItems(data: RulesImportData) : Promise<void>
    {
        if (data.deleteExtra) {
            MOCK_RULES = {};
        }

        for (const config of data.data.items) {
            const item = _.clone({ ...config, items: [], logs: [] });
            MOCK_RULES[item.name] = item;
        }

        this._notifyRules();

        return Promise.resolve();
    }   

    getItemStatuses() : Promise<RuleStatus[]> {
        return Promise.timeout(100).then(() => this._getItemStatuses());
    }

    getItemResult(name: string) : Promise<RuleResult> { //  | null
        return Promise.timeout(500).then(() => {
            return this._getItemResult(name)!
        });
    }


    subscribeItemStatuses(cb: (items: RuleStatus[]) => void)
    {
        const id = uuid();
        this._allItemsSubscribers[id] = cb;

        cb(this._getItemStatuses());
    }

    subscribeItemResult(cb: (result: RuleResult) => void) : RuleResultSubscriber
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

    private _getItemStatuses() : RuleStatus[] {
        const allRules = _.values(MOCK_RULES);
        const list = allRules.map(x => {
            const item : RuleStatus = {
                name: x.name,
                enabled: x.enabled,
                is_current: x.is_current,
                error_count: x.logs.length,
                item_count: x.items.length,
            }
            return item;
        });
        return list;
    }

    private _getItemResult(name: string) : RuleResult | null
    {
        let innerRule = MOCK_RULES[name];
        if (!innerRule) {
            return null;
        }

        const item : RuleResult = {
            name: innerRule.name,
            items: innerRule.items,
            is_current: innerRule.is_current,
            error_count: innerRule.logs.length,
            logs: innerRule.logs
        }

        return item;
    }
}
