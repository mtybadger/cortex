export interface QueryFilters {
    authors?: string;
    author?: string;
    doi?: string;
    title?: string;
    publisher?: string;
}

export interface SearchMessage {
    type: 'search';
    query: string;
    sort: string;
}

export interface CiteMessage {
    type: 'cite';
    title: string;
    doi: string;
}

// Add more types as needed
