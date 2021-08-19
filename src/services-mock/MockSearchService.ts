import _ from "the-lodash"
import { Promise } from 'the-promise'

import { getRandomDnList } from "./utils"

import { ISharedState } from "@kubevious/ui-framework"

import { MockRootApiService } from "./MockRootApiService"
import { ISearchService, SearchQueryItem, SearchQueryResult } from '@kubevious/ui-middleware/dist/services/search';


export class MockSearchService implements ISearchService {

    constructor(parent: MockRootApiService, sharedState: ISharedState) {
    }

    close() {

    }

    fetchSearchResults(criteria: any) : Promise<SearchQueryResult>
    {
        const result : SearchQueryResult = {
            wasFiltered: false,
            totalCount: 0,
            results: []
        };

        if (criteria) {
            let res = getRandomDnList()
            result.results = res.map((x) => ({
                dn: x,
            }));
            result.wasFiltered = true;
            result.totalCount = result.results.length;
        }
        
        return Promise.resolve(result);
    }
    

    autocompleteLabelKeys(criteria) : Promise<string[]>
    {
        let results : string[] = [
            'foo1',
            'foo2',
            'foo3',
        ]
        return Promise.resolve(results);
    }
    
    autocompleteLabelValues(key: string, criteria: string) : Promise<string[]>
    {
        let results : string[] = [
            'bar1',
            'bar2',
            'bar3',
        ]
        return Promise.resolve(results);
    }

    autocompleteAnnotationKeys(criteria: string) : Promise<string[]>
    {
        let results : string[] = [
            'foo1',
            'foo2',
            'foo3',
        ]
        return Promise.resolve(results);
    }
    
    autocompleteAnnotationValues(key: string, criteria: string) : Promise<string[]>
    {
        let results : string[] = [
            'bar1',
            'bar2',
            'bar3',
        ]
        return Promise.resolve(results);
    }
}
