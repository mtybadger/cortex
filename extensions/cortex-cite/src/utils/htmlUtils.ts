export function generateResultsHtml(items: any[], isRateLimited: boolean = false): string {
    if (isRateLimited) {
        return generateRateLimitHtml() + generateItemsHtml(items);
    }
    return generateItemsHtml(items);
}

function generateItemsHtml(items: any[]): string {
    if (!items || items.length === 0) {
        return '<p>No results found.</p>';
    }

    let html = '';
    items.forEach(item => {
        const title = item.title || 'No title';
        const doi = item.externalIds?.doi || '';
        const link = item.url || '#';
        const publicationDate = item.publicationDate ? new Date(item.publicationDate).toLocaleDateString() : 'No date';
        const publicationTypes = item.publicationTypes ? item.publicationTypes.join(', ') : 'Unknown type';
        const openAccessPdf = item.openAccessPdf?.url || '';
        const authors = item.authors ? item.authors.map((author: any) => author.name).join(', ') : 'Unknown authors';
        const abstract = item.abstract || 'No abstract available';
        const venue = item.venue || 'Unknown venue';

        const encodedItem = encodeURIComponent(JSON.stringify(item));

        html += `
            <div class="paper">
                <a href="${link}" class="paper-title" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>
                <p class="paper-authors">${escapeHtml(authors)}</p>
                <p class="paper-info">`;
        
        if (publicationTypes) {
            html += `<span class="paper-type">${escapeHtml(publicationTypes)}</span> • `;
        }
        
        html += `<span class="paper-date">${publicationDate}</span> • <span class="paper-venue">${escapeHtml(venue)}</span></p>`;
        
        html += `<p class="paper-abstract">${escapeHtml(abstract)}</p>`;
        
        if (openAccessPdf) {
            html += `<a href="${openAccessPdf}" class="paper-pdf" target="_blank" rel="noopener noreferrer">Open Access PDF</a>`;
        }

        html += `<button class="cite-button" data-title="${escapeHtml(title)}" data-item="${encodedItem}">Cite This &rarr;</button>`;

        html += `</div>`;
    });

    return html;
}

export function generateRateLimitHtml(): string {
    return `
        <div class="rate-limit-warning">
            <p><strong>Note:</strong> The S2 Search API is currently rate-limited, since you are using it for free. Results may be less accurate or complete.</p>
        </div>
    `;
}

export function escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
