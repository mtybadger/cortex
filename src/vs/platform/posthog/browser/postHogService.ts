import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton, InstantiationType } from 'vs/platform/instantiation/common/extensions';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IRequestService } from 'vs/platform/request/common/request';
import { IFileService } from 'vs/platform/files/common/files';
import { CancellationToken } from 'vs/base/common/cancellation';

export interface IPostHogEvent {
    eventName: string;
    properties?: Record<string, any>;
}

export interface IPostHogService {
    readonly _serviceBrand: undefined;

    captureEvent(event: IPostHogEvent): void;
    identify(distinctId: string, properties?: Record<string, any>): void;
}

export class PostHogService implements IPostHogService {
    readonly _serviceBrand: undefined;

    private readonly apiKey = process.env.POSTHOG_API_KEY;
    private readonly apiUrl = 'https://us.i.posthog.com/capture/';

    constructor(
        @IEnvironmentService private readonly environmentService: IEnvironmentService,
        @IRequestService private readonly requestService: IRequestService,
        @IFileService private readonly fileService: IFileService
    ) { }

    async captureEvent(event: IPostHogEvent): Promise<void> {
        const userId = await this.fileService.readFile(this.environmentService.serviceMachineIdResource).then(content => content.value.toString().trim());
        const payload = {
            api_key: this.apiKey,
            event: event.eventName,
            properties: {
                distinct_id: userId,
                ...event.properties
            },
            timestamp: new Date().toISOString()
        };

        try {
            await this.requestService.request({
                type: 'POST',
                url: this.apiUrl,
                data: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                }
            }, /* CancellationToken */ CancellationToken.None);
            console.log('Captured event:', event, "for user", userId);
        } catch (error) {
            console.error('Failed to capture PostHog event:', error);
        }
    }

    identify(distinctId: string, properties?: Record<string, any>): void {
        // For now, we'll just log this. In a real implementation, you might want to send this to PostHog as well.
        console.log('Identified user:', distinctId, properties);
    }
}

export const IPostHogService = createDecorator<IPostHogService>('postHogService');

registerSingleton(IPostHogService, PostHogService, InstantiationType.Delayed);
