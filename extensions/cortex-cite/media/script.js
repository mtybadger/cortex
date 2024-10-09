// media/script.js
(function() {
    const vscode = acquireVsCodeApi();

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'search-results':
                const resultsContainer = document.getElementById('results');
                resultsContainer.innerHTML = message.html;
                break;
            case 'error':
                const errorContainer = document.getElementById('results');
                errorContainer.innerHTML = `<p class="error">${message.message}</p>`;
                break;
        }
    });

    // Intercept HTMX requests
    document.getElementById('search-form').addEventListener('htmx:configRequest', (evt) => {
        const form = evt.target;
        const formData = new FormData(form);
        const query = formData.get('query');
        const sort = formData.get('sort');

        // Prevent HTMX from making the actual HTTP request
        evt.preventDefault();

        // Send message to the extension to perform the search
        vscode.postMessage({
            type: 'search',
            query: query,
            sort: sort
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        const sortButton = document.getElementById('sort-button');
        const sortMenu = document.getElementById('sort-menu');
        const sortOptions = document.querySelectorAll('.sort-option');
        const sortInput = document.getElementById('sort');

        // Toggle dropdown menu visibility
        sortButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling up
            sortMenu.classList.toggle('hidden');
        });

        // Handle sort option selection
        sortOptions.forEach(option => {
            option.addEventListener('click', () => {
                const selectedSort = option.getAttribute('data-sort');
                sortInput.value = selectedSort;
                sortMenu.classList.add('hidden');
                // Optionally, submit the form automatically upon selection
                // document.getElementById('search-form').requestSubmit();
            });
        });

        // Close the dropdown if clicked outside
        document.addEventListener('click', (event) => {
            if (!sortMenu.contains(event.target) && !sortButton.contains(event.target)) {
                sortMenu.classList.add('hidden');
            }
        });
    });

    // Add this to your existing script.js file

    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('cite-button')) {
            const title = event.target.getAttribute('data-title');
            const item = event.target.getAttribute('data-item');
            vscode.postMessage({
                type: 'cite',
                title: title,
                item: item
            });
        }
    });
})();