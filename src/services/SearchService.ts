import { Promise } from 'the-promise'
import { BaseService } from './BaseService'

import { ISearchService, SearchQueryResult } from '@kubevious/ui-middleware/dist/services/search';

export class SearchService extends BaseService implements ISearchService {

    fetchSearchResults(criteria: any) : Promise<SearchQueryResult>
    {
        return this.client
            .post<SearchQueryResult>("/search", {}, criteria)
            .then((result) => {
                return result.data;
            });
    }

    autocompleteLabelKeys(criteria) : Promise<string[]>
    {
        return this.client
            .post<string[]>("/search/labels", {}, { criteria : criteria })
            .then((result) => {
                return result.data;
            });
    }
    
    autocompleteLabelValues(key: string, criteria: string) : Promise<string[]>
    {
        return this.client
            .post<string[]>("/search/labels/values", {}, { key: key, criteria : criteria })
            .then((result) => {
                return result.data;
            });
    }
    
    autocompleteAnnotationKeys(criteria: string) : Promise<string[]>
    {
        return this.client
            .post<string[]>("/search/annotations", {}, { criteria : criteria })
            .then((result) => {
                return result.data;
            });
    }
    
    autocompleteAnnotationValues(key: string, criteria: string) : Promise<string[]>
    {
        return this.client
            .post<string[]>("/search/annotations/values", {}, { key: key, criteria : criteria })
            .then((result) => {
                return result.data;
            });
    }

}
