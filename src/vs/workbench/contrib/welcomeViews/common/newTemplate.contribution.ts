/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action2, registerAction2, MenuId } from 'vs/platform/actions/common/actions';
// import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { Disposable } from 'vs/base/common/lifecycle';
import { localize2 } from 'vs/nls';
import { ServicesAccessor, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
// import { URI } from 'vs/base/common/uri';
// import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
// import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
// import { INotificationService } from 'vs/platform/notification/common/notification';
// import { join } from 'path';


registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.showNewTemplateEntries',
            title: localize2('welcome.newTemplate', 'New From Template...'),
            category: localize2('File', 'File'),
            f1: true,
            menu: {
                id: MenuId.MenubarFileMenu,
                group: '1_new',
                order: 2
            }
        });
    }

    async run(accessor: ServicesAccessor): Promise<void> {
        const instantiationService = accessor.get(IInstantiationService);
        const manager = NewTemplateManager.getInstance(instantiationService);
        await manager.run();
    }
});

class NewTemplateManager extends Disposable {
    private static instance: NewTemplateManager | undefined;

    static getInstance(instantiationService: IInstantiationService): NewTemplateManager {
        if (!NewTemplateManager.instance) {
            NewTemplateManager.instance = instantiationService.createInstance(NewTemplateManager);
        }
        return NewTemplateManager.instance;
    }

    constructor(
        @ICommandService private readonly commandService: ICommandService,
        // @IQuickInputService private readonly quickInputService: IQuickInputService,
        // @ITelemetryService private readonly telemetryService: ITelemetryService,
        // @IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
        // @INotificationService private readonly notificationService: INotificationService
    ) {
        super();

        NewTemplateManager.instance = this;

        this._register({ dispose: () => { if (NewTemplateManager.instance === this) { NewTemplateManager.instance = undefined; } } });
    }

    async run(): Promise<void> {
        await this.commandService.executeCommand('cortex-templates.showTemplatePicker');
    }
}