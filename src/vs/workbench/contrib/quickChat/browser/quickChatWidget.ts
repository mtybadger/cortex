// src/quickChat/quickChatWidget.ts

import { QuickChatController } from './quickChatController';
import { Disposable, DisposableStore } from 'vs/base/common/lifecycle';
import { localize } from 'vs/nls';
import 'vs/css!./media/quickChat';

export class QuickChatWidget extends Disposable {
    private domNode: HTMLElement;
    private disposer = new DisposableStore();
    private submitButton: HTMLButtonElement;
    private acceptButton: HTMLButtonElement;
    private rejectButton: HTMLButtonElement;
    private loadingIndicator: HTMLSpanElement;
    private modelSwitcherContainer: HTMLDivElement;
    
    constructor(private controller: QuickChatController) {
        super();

        this.domNode = document.createElement('div');
        this.domNode.className = 'quick-chat-container';

        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'quick-chat-widget';
        this.domNode.appendChild(widgetContainer);

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'quick-chat-close-button';
        closeButton.title = localize('quickChat.close', 'Close Chat');
        closeButton.setAttribute('aria-label', localize('quickChat.close', 'Close Chat'));
        closeButton.textContent = '×';
        widgetContainer.appendChild(closeButton);

        // Create and append body
        const body = document.createElement('div');
        body.className = 'quick-chat-body';

        const textarea = document.createElement('textarea');
        textarea.className = 'quick-chat-input';
        textarea.placeholder = localize('quickChat.placeholder', 'Edit instructions...');
        textarea.rows = 1;
        body.appendChild(textarea);

        // Create footer
        const footer = document.createElement('div');
        footer.className = 'quick-chat-footer';

        this.submitButton = document.createElement('button');
        this.submitButton.className = 'quick-chat-button';
        this.submitButton.textContent = localize('quickChat.submit', 'Generate');
        footer.appendChild(this.submitButton);

        this.acceptButton = document.createElement('button');
        this.acceptButton.className = 'quick-chat-button';
        this.acceptButton.textContent = localize('quickChat.accept', 'Accept');
        this.acceptButton.style.display = 'none';
        footer.appendChild(this.acceptButton);

        this.rejectButton = document.createElement('button');
        this.rejectButton.className = 'quick-chat-button';
        this.rejectButton.textContent = localize('quickChat.reject', 'Reject');
        this.rejectButton.style.display = 'none';
        footer.appendChild(this.rejectButton);

        this.loadingIndicator = document.createElement('span');
        this.loadingIndicator.className = 'quick-chat-loading-indicator';
        this.loadingIndicator.style.display = 'none';
        footer.appendChild(this.loadingIndicator);

        // Add model switcher
        this.modelSwitcherContainer = document.createElement('div');
        this.modelSwitcherContainer.className = 'quick-chat-model-switcher-container';

        const modelSwitcher = document.createElement('select');
        modelSwitcher.className = 'quick-chat-model-switcher';
        modelSwitcher.title = localize('quickChat.modelSwitcher', 'Select AI Model');
        // Add options to the model switcher (you may want to populate this dynamically)
        ['GPT-4o'].forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSwitcher.appendChild(option);
        });

        const downArrow = document.createElement('span');
        downArrow.className = 'quick-chat-model-switcher-arrow';
        downArrow.textContent = '▼';

        this.modelSwitcherContainer.appendChild(modelSwitcher);
        this.modelSwitcherContainer.appendChild(downArrow);
        footer.appendChild(this.modelSwitcherContainer);

        // Add spacer
        const spacer = document.createElement('div');
        spacer.style.flexGrow = '1';
        footer.appendChild(spacer);

        body.appendChild(footer);
        widgetContainer.appendChild(body);

        // Event Listeners
        closeButton.addEventListener('click', () => this.controller.hideChat());
        this.disposer.add({ dispose: () => closeButton.removeEventListener('click', () => this.controller.hideChat()) });

        this.submitButton.addEventListener('click', () => this.submitMessage());
        this.disposer.add({ dispose: () => this.submitButton.removeEventListener('click', () => this.submitMessage()) });

        this.acceptButton.addEventListener('click', () => this.acceptDiff());
        this.disposer.add({ dispose: () => this.acceptButton.removeEventListener('click', () => this.acceptDiff()) });

        this.rejectButton.addEventListener('click', () => this.rejectDiff());
        this.disposer.add({ dispose: () => this.rejectButton.removeEventListener('click', () => this.rejectDiff()) });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                this.submitMessage();
                return false;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.controller.hideChat();
                return false;
            }
            return true;
        };

        textarea.addEventListener('keydown', handleKeyDown, true);
        this.disposer.add({ dispose: () => textarea.removeEventListener('keydown', handleKeyDown, true) });

        // Add event listener for model switcher
        modelSwitcher.addEventListener('change', (e) => this.onModelChange(e));
        this.disposer.add({ dispose: () => modelSwitcher.removeEventListener('change', (e) => this.onModelChange(e)) });
    }

    getDomNode(): HTMLElement {
        return this.domNode;
    }

    show(): void {
        this.domNode.style.display = 'flex';
        const input = this.domNode.querySelector('.quick-chat-input') as HTMLTextAreaElement;
        input?.focus();
    }

    hide(): void {
        this.domNode.style.display = 'none';
    }
    
    private submitMessage(): void {
        const input = this.domNode.querySelector('.quick-chat-input') as HTMLTextAreaElement;
        const message = input.value.trim();
        if (message) {
            this.showLoadingIndicator();   
            this.controller.executeChatCommand(message);
        }
    }

    private showLoadingIndicator(): void {
        this.submitButton.style.display = 'none';
        this.loadingIndicator.style.display = 'inline';
    }

    hideLoadingIndicator(): void {
        this.submitButton.style.display = 'inline';
        this.loadingIndicator.style.display = 'none';
    }

    showAcceptReject(): void {
        this.submitButton.style.display = 'none';
        this.loadingIndicator.style.display = 'none';
        this.modelSwitcherContainer.style.display = 'none';
        this.acceptButton.style.display = 'inline';
        this.rejectButton.style.display = 'inline';
    }

    hideAcceptReject(): void {
        this.acceptButton.style.display = 'none';
        this.rejectButton.style.display = 'none';
        this.submitButton.style.display = 'inline';
    }

    private onModelChange(e: Event): void {
        const select = e.target as HTMLSelectElement;
        const selectedModel = select.value;
        console.log(`Switched to model: ${selectedModel}`);
        // Implement model switching logic
    }

    private acceptDiff(): void {
        this.controller.acceptDiff();
    }

    private rejectDiff(): void {
        this.controller.rejectDiff();
        // Clear the text area
        const input = this.domNode.querySelector('.quick-chat-input') as HTMLTextAreaElement;
        input.value = '';
        this.hideAcceptReject();
        input.focus();
    }

    override dispose(): void {
        this.domNode.remove();
        this.disposer.dispose();
        super.dispose();
    }
}