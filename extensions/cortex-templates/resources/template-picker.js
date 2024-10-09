(function() {
    const vscode = acquireVsCodeApi();

    function filterTemplates() {
        const keyword = document.getElementById('searchInput').value.toLowerCase();
        const templates = document.querySelectorAll('.template-item');
        
        templates.forEach(template => {
            const title = template.querySelector('h3').textContent.toLowerCase();
            const description = template.querySelector('p').textContent.toLowerCase();
            if (title.includes(keyword) || description.includes(keyword)) {
                template.style.display = '';
            } else {
                template.style.display = 'none';
            }
        });
    }

    document.getElementById('searchInput').addEventListener('input', filterTemplates);

    function addTemplateItemListeners() {
        document.getElementById('templateContainer').addEventListener('click', function(event) {
            const templateItem = event.target.closest('.template-item');
            if (templateItem) {
                const templateId = templateItem.dataset.templateId;
                vscode.postMessage({
                    type: 'createTemplate',
                    templateId: templateId
                });
            }
        });
    }

    // Add this function to update templates dynamically
    function updateTemplates(templates) {
        const container = document.getElementById('templateContainer');
        container.innerHTML = ''; // Clear existing content

        templates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.dataset.templateId = template.id;
            templateItem.innerHTML = `
                <img src="${template.image}" alt="${template.name}">
                <h3>${template.name}</h3>
                <p>${template.description}</p>
            `;
            container.appendChild(templateItem);
        });

        // Re-add event listeners
        addTemplateItemListeners();
    }

    // Add this event listener for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'updateTemplates':
                updateTemplates(message.templates);
                break;
        }
    });

    // Initial setup
    addTemplateItemListeners();
})();