export function parseQuery(query: string): { baseQuery: string, filters: { [key: string]: string } } {
    const filterRegex = /(\w+)="([^"]+)"/g;
    let match;
    const filters: { [key: string]: string } = {};
    let baseQuery = query;

    while ((match = filterRegex.exec(query)) !== null) {
        const key = match[1].toLowerCase();
        const value = match[2];
        if (['authors', 'author', 'doi', 'title', 'publisher'].includes(key)) {
            filters[key] = value;
            baseQuery = baseQuery.replace(match[0], '').trim();
        }
    }

    return { baseQuery, filters };
}

export function constructApiUrl(baseQuery: string, filters: { [key: string]: string }, sort: string): { primary: string, fallback: string } {
    const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
    const bulkSearchUrl = 'https://api.semanticscholar.org/graph/v1/paper/search/bulk';
    const params: string[] = [];

    // Add the main query
    params.push(`query=${encodeURIComponent(baseQuery.trim())}`);

    // Add fields parameter
    params.push('fields=paperId,title,url,year,publicationTypes,publicationDate,openAccessPdf,authors,abstract,venue,externalIds');

    // Handle filters
    if (filters['year']) {
        params.push(`year=${encodeURIComponent(filters['year'])}`);
    }
    if (filters['venue']) {
        params.push(`venue=${encodeURIComponent(filters['venue'])}`);
    }
    if (filters['authors'] || filters['author']) {
        // Note: The relevance search doesn't support direct author filtering, so we'll include it in the main query
        params[0] += encodeURIComponent(` author:"${filters['authors'] || filters['author']}"`);
    }

    // Handle sorting (Note: relevance search doesn't support sorting, so we'll remove this)
    // The results will be sorted by relevance by default

    // Set a reasonable limit and offset for pagination
    params.push('limit=20');
    params.push('offset=0');

    const primaryUrl = `${baseUrl}?${params.join('&')}`;
    
    // Construct fallback URL for bulk search
    const fallbackParams = [
        `query=${encodeURIComponent(baseQuery.trim())}`,
        'fields=paperId,title,url,year,publicationTypes,publicationDate,openAccessPdf,authors,abstract,venue,externalIds,publicationVenue,journal,citationStyles',
        'limit=20'
    ];
     // Add sorting to fallback URL
     switch (sort) {
        case 'issued':
            fallbackParams.push('sort=publicationDate:desc');
            break;
        case 'is-referenced-by-count':
            fallbackParams.push('sort=citationCount:desc');
            break;
        default:
            // For 'relevance' or any other value, use paperId as the default sort
            fallbackParams.push('sort=citationCount:desc');
            break;
    }

    const fallbackUrl = `${bulkSearchUrl}?${fallbackParams.join('&')}`;

    return { primary: primaryUrl, fallback: fallbackUrl };
}
