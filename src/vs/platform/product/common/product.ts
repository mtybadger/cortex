/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { env } from 'vs/base/common/process';
import { IProductConfiguration } from 'vs/base/common/product';
import { ISandboxConfiguration } from 'vs/base/parts/sandbox/common/sandboxTypes';

/**
 * @deprecated You MUST use `IProductService` if possible.
 */
let product: IProductConfiguration;

// Native sandbox environment
const vscodeGlobal = (globalThis as any).vscode;
if (typeof vscodeGlobal !== 'undefined' && typeof vscodeGlobal.context !== 'undefined') {
	const configuration: ISandboxConfiguration | undefined = vscodeGlobal.context.configuration();
	if (configuration) {
		product = configuration.product;
	} else {
		throw new Error('Sandbox: unable to resolve product configuration from preload script.');
	}
}
// _VSCODE environment
else if (globalThis._VSCODE_PRODUCT_JSON && globalThis._VSCODE_PACKAGE_JSON) {
	// Obtain values from product.json and package.json-data
	product = globalThis._VSCODE_PRODUCT_JSON as unknown as IProductConfiguration;

	const { serviceUrl, searchUrl, itemUrl, controlUrl } = product.extensionsGallery || {};

	Object.assign(product, {
		extensionsGallery: {
			serviceUrl: env['VSCODE_GALLERY_SERVICE_URL'] || serviceUrl,
			searchUrl: env['VSCODE_GALLERY_SEARCH_URL'] || searchUrl,
			itemUrl: env['VSCODE_GALLERY_ITEM_URL'] || itemUrl,
			controlUrl: env['VSCODE_GALLERY_CONTROL_URL'] || controlUrl,
		}
	});

	// Merge user-customized product.json
	try {
		const merge = (...objects: any[]) =>
			objects.reduce((result, current) => {
				Object.keys(current).forEach((key) => {
					if (Array.isArray(result[key]) && Array.isArray(current[key])) {
						result[key] = current[key];
					} else if (typeof result[key] === 'object' && typeof current[key] === 'object') {
						result[key] = merge(result[key], current[key]);
					} else {
						result[key] = current[key];
					}
				});

				return result;
			}, {}) as any;

		const userProduct = (globalThis as Record<string, any>)._VSCODE_USER_PRODUCT_JSON || {};

		product = merge(product, userProduct);
	} catch (ex) {
	}

	// Running out of sources
	if (env['VSCODE_DEV']) {
		Object.assign(product, {
			nameShort: `${product.nameShort} Dev`,
			nameLong: `${product.nameLong} Dev`,
			dataFolderName: `${product.dataFolderName}-dev`,
			serverDataFolderName: product.serverDataFolderName ? `${product.serverDataFolderName}-dev` : undefined
		});
	}

	// Version is added during built time, but we still
	// want to have it running out of sources so we
	// read it from package.json only when we need it.
	if (!product.version) {
		const pkg = globalThis._VSCODE_PACKAGE_JSON as { version: string, release: string };

		Object.assign(product, {
			version: pkg.version,
			release: pkg.release
		});
	}
}

// Web environment or unknown
else {

	// Built time configuration (do NOT modify)
	product = { /*BUILD->INSERT_PRODUCT_CONFIGURATION*/ } as any;

	// Running out of sources
	if (Object.keys(product).length === 0) {
		Object.assign(product, {
			version: '1.91.0-dev',
			nameShort: 'Code - OSS Dev',
			nameLong: 'Code - OSS Dev',
			applicationName: 'code-oss',
			dataFolderName: '.vscode-oss',
			urlProtocol: 'code-oss',
			reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
			licenseName: 'MIT',
			licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
			serverLicenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt'
		});
	}
}

/**
 * @deprecated You MUST use `IProductService` if possible.
 */
export default product;
