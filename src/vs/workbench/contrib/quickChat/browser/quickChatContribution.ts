// src/quickChat/browser/quickChatContribution.ts

import { registerEditorContribution, EditorContributionInstantiation } from 'vs/editor/browser/editorExtensions';
import { QuickChatController } from './quickChatController';
import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { OPEN_QUICK_CHAT_COMMAND, COMPLETED_STREAM_COMMAND, COMPLETED_ACCEPT_REJECT_COMMAND } from './commands';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { KeyCode, KeyMod } from 'vs/base/common/keyCodes';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { KeybindingWeight } from 'vs/platform/keybinding/common/keybindingsRegistry';
// Unique ID for the Quick Chat Controller
const QUICK_CHAT_CONTROLLER_ID = 'quickChatController';

// Register the Quick Chat Controller as an editor contribution
registerEditorContribution(
    QUICK_CHAT_CONTROLLER_ID,
    QuickChatController,
    EditorContributionInstantiation.Eager
);

// Register the Open Quick Chat command
registerAction2(class OpenQuickChatAction extends Action2 {
    constructor() {
        super({
            id: OPEN_QUICK_CHAT_COMMAND,
            title: { value: 'Open Inline Chat', original: 'Open Inline Chat' },
            f1: true,
            keybinding: {
                weight: KeybindingWeight.ExternalExtension + 1,
                primary: KeyMod.CtrlCmd | KeyCode.KeyK,
                when: ContextKeyExpr.equals('editorFocus', true)
            },
        });
    }

    run(accessor: ServicesAccessor): void {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        const activeEditor = editorService.activeTextEditorControl
        
        if (activeEditor && 'getContribution' in activeEditor) {
            const controller = (activeEditor as ICodeEditor).getContribution(QUICK_CHAT_CONTROLLER_ID) as QuickChatController;
            
            if (controller) {
                controller.toggleChat();
            } else {
                console.error('QuickChatController not found. Creating a new instance.');
                const newController = instantiationService.createInstance(QuickChatController, (activeEditor as ICodeEditor));
                (activeEditor as any)._contributions = (activeEditor as any)._contributions || {};
                (activeEditor as any)._contributions[QUICK_CHAT_CONTROLLER_ID] = newController;
                newController.toggleChat();
            }
        } else {
            console.error('No active editor or getContribution method not found');
        }
    }
});

// Register the Process Quick Chat Message command
registerAction2(class ProcessQuickChatMessageAction extends Action2 {
    constructor() {
        super({
            id: COMPLETED_STREAM_COMMAND,
            title: { value: 'Completed Stream', original: 'Completed Stream' }
        });
    }

    run(accessor: ServicesAccessor, editor: ICodeEditor, message: string): void {
        const editorService = accessor.get(IEditorService);
        const activeEditor = editorService.activeTextEditorControl as ICodeEditor;

        if (!activeEditor) {
            console.error('No active editor found');
            return;
        }

        if (typeof activeEditor.getContribution !== 'function') {
            console.error('Active editor does not have getContribution method');
            return;
        }

        const controller = QuickChatController.get(activeEditor);
        if (controller) {
            controller.onCompletedStream();
        } else {
            console.error('QuickChatController not found for the active editor');
        }
    }
});

registerAction2(class ProcessQuickChatMessageAction extends Action2 {
    constructor() {
        super({
            id: COMPLETED_ACCEPT_REJECT_COMMAND,
            title: { value: 'Completed Accept Reject', original: 'Completed Accept Reject' }
        });
    }

    run(accessor: ServicesAccessor, editor: ICodeEditor, message: string): void {
        const editorService = accessor.get(IEditorService);
        const activeEditor = editorService.activeTextEditorControl as ICodeEditor;

        if (!activeEditor) {
            console.error('No active editor found');
            return;
        }

        if (typeof activeEditor.getContribution !== 'function') {
            console.error('Active editor does not have getContribution method');
            return;
        }

        const controller = QuickChatController.get(activeEditor);
        if (controller) {
            controller.onCompletedAcceptReject();
        } else {
            console.error('QuickChatController not found for the active editor');
        }
    }
});