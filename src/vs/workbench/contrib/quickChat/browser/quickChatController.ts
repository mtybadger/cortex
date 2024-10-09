// src/quickChat/browser/quickChatController.ts

import { ICodeEditor, IViewZoneChangeAccessor } from 'vs/editor/browser/editorBrowser';
import { Disposable } from 'vs/base/common/lifecycle';
import { QuickChatWidget } from './quickChatWidget';
import 'vs/css!./media/quickChat';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { ICommandService, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IPostHogService } from 'vs/platform/posthog/browser/postHogService';

export class QuickChatController extends Disposable implements IEditorContribution {
    static get(editor: ICodeEditor): QuickChatController | null {
        return editor.getContribution<QuickChatController>('quickChatController');
    }

    private widget: QuickChatWidget | null = null;
    private viewZoneId: string | null = null;

    constructor(
        private editor: ICodeEditor,
        @ICommandService private commandService: ICommandService,
        @IPostHogService private posthogService: IPostHogService
    ) {
        super();
        this._register({
            dispose: () => {
                this.hideChat();
            }
        });
    }

    toggleChat(): void {
        if (this.widget && this.viewZoneId !== null) {
            this.hideChat();
        } else {
            this.showChat();
        }
    }

    showChat(): void {
        if (!this.widget) {
            this.widget = new QuickChatWidget(this);
        }

        let position: { lineNumber: number; column: number };
        const selection = this.editor.getSelection();

        if (selection && !selection.isEmpty()) {
            // If there's a selection, place the widget above the first selected line
            position = { lineNumber: selection.startLineNumber - 1, column: 1 };
        } else {
            // Otherwise, use the current cursor position
            const cursorPosition = this.editor.getPosition();
            if (!cursorPosition) {
                console.error('Cannot determine editor position to show Quick Chat.');
                return;
            }
            position = { lineNumber: cursorPosition.lineNumber - 1, column: cursorPosition.column };
        }

        this.editor.changeViewZones((accessor: IViewZoneChangeAccessor) => {
            if (this.viewZoneId !== null) {
                accessor.removeZone(this.viewZoneId);
                this.viewZoneId = null;
            }

            const domNode = this.widget!.getDomNode();

            const viewZone = {
                afterLineNumber: position.lineNumber,
                domNode: domNode,
                heightInLines: 4,
            };

            this.viewZoneId = accessor.addZone(viewZone);

            // Optionally, scroll to the view zone
            this.editor.revealPositionInCenterIfOutsideViewport(position);
        });

        // Focus the textarea after ensuring it is rendered, with a longer timeout
        setTimeout(() => {
            const textarea = this.widget!.getDomNode().querySelector('.quick-chat-input') as HTMLTextAreaElement;
            if (textarea) {
                textarea.focus();
            } else {
                console.warn('Quick Chat textarea not found, retrying focus...');
                setTimeout(() => {
                    const retryTextarea = this.widget!.getDomNode().querySelector('.quick-chat-input') as HTMLTextAreaElement;
                    retryTextarea?.focus();
                }, 100);
            }
        }, 50);
    }

    hideChat(): void {
        if (this.viewZoneId !== null) {
            this.editor.changeViewZones((accessor: IViewZoneChangeAccessor) => {
                accessor.removeZone(this.viewZoneId!);
                this.viewZoneId = null;
            });
        }
        if (this.widget) {
            this.widget.dispose();
            this.widget = null;
        }
    }

    // Method to handle message processing
    executeChatCommand(message: string): void {
        const selection = this.editor.getSelection();
        let range;
        if (!selection) {
            // If there's no selection, use the cursor position
            const position = this.editor.getPosition();
            if (!position) {
                console.error('Cannot determine editor position for Quick Chat command.');
                return;
            }

            range = {
                startLine: position.lineNumber,
                startCharacter: position.column,
                endLine: position.lineNumber,
                endCharacter: position.column
            };
        } else {
            range = {
                startLine: selection.startLineNumber,
                startCharacter: selection.startColumn,
                endLine: selection.endLineNumber,
                endCharacter: selection.endColumn
            };
        }

        this.commandService

         // Check if the command is registered
         if (CommandsRegistry.getCommand('continue.quickEdit')) {

            try {
                this.posthogService.captureEvent({
                    eventName: 'quickChat',
                    properties: {
                        message: message,
                        range: range
                    }
                });
            } catch (error) {
                // Fail quietly
            }

            console.log('Calling quickEdit with prompt: ', message, ' and range: ', range);
            // Execute the extension command with arguments
            this.commandService.executeCommand('continue.quickEdit', {
                prompt: message,
                range: range
            });
        } else {
            console.error('Command "continue.quickEdit" is not registered.');
        }

        this.editor.focus();
    }

    onCompletedStream(): void {
        if (this.widget) {
            this.widget.showAcceptReject();
        } else {
            console.error('QuickChatWidget not found.');
        }
    }

    acceptDiff(): void {
        if (this.widget) {
            if (CommandsRegistry.getCommand('continue.acceptDiff')) {
                this.commandService.executeCommand('continue.acceptDiff');
                this.onCompletedAcceptReject();
            } else {
                console.error('Command "continue.acceptDiff" is not registered.');
            }
        } else {
            console.error('QuickChatWidget not found.');
        }
    }   

    rejectDiff(): void {
        if (this.widget) {
            if (CommandsRegistry.getCommand('continue.rejectDiff')) {
                this.commandService.executeCommand('continue.rejectDiff');
            } else {
                console.error('Command "continue.rejectDiff" is not registered.');
            }
        } else {
            console.error('QuickChatWidget not found.');
        }
    }
    

    onCompletedAcceptReject(): void {
        this.hideChat();
    }
}