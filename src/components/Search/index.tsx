import { Search } from '@kubevious/ui-search';
import { SEARCH_FILTER_METADATA } from './search-metadata';

export const SearchPage = () => {
    
    return (
        <Search filterList={SEARCH_FILTER_METADATA} />
    );
};
