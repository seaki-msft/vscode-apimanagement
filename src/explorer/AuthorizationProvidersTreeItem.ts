/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { AzExtTreeItem, AzureParentTreeItem, ICreateChildImplContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationProviderContract } from "../azure/apim/contracts";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { AuthorizationProviderTreeItem } from "./AuthorizationProviderTreeItem";

export interface IAuthorizationProviderTreeItemContext extends ICreateChildImplContext {
    authorizationProviderName: string;
    identityProvider: string;
    clientId: string;
    clientSecret: string;
    scopes: string;
    parameters : {
        [name: string]: string;
    };
}

export class AuthorizationProvidersTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementAuthorizationProviders';
    public label: string = "AuthorizationProviders";
    public contextValue: string = AuthorizationProvidersTreeItem.contextValue;
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const apimService = new ApimService(this.root.credentials, 
            this.root.environment.resourceManagerEndpointUrl, 
            this.root.subscriptionId, 
            this.root.resourceGroupName, 
            this.root.serviceName);

        const authorizationProviders: IAuthorizationProviderContract[] = await apimService.listAuthorizationProviders();

        return this.createTreeItemsWithErrorHandling(
            authorizationProviders,
            "invalidApiManagementAuthorizationProvider",
            async (authorizationProvider: IAuthorizationProviderContract) => new AuthorizationProviderTreeItem(this, authorizationProvider),
            (authorizationProvider: IAuthorizationProviderContract) => {
                return authorizationProvider.name;
            });
    }

    public async createChildImpl(context: IAuthorizationProviderTreeItemContext): Promise<AuthorizationProviderTreeItem> {
        if (context.authorizationProviderName 
            && context.identityProvider
            && context.clientId
            && context.clientSecret) {

            const authorizationProviderName = context.authorizationProviderName;
            context.showCreatingTreeItem(authorizationProviderName);
            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                const authorizationProvider = await apimService.createAuthorizationProvider(context.authorizationProviderName, context.identityProvider, context.clientId, context.clientSecret, context.scopes, context.parameters);
                const message = `Successfully created authorization provider "${authorizationProvider.name}". 
Please add redirect uri '${authorizationProvider.properties.OAuthSettings.RedirectUrl}' to the OAuth application before authorizing an authorization.`;

                ext.outputChannel.show();
                ext.outputChannel.appendLine(message);
                
                window.showInformationMessage(localize("createdAuthorizationProvider", message));

                return new AuthorizationProviderTreeItem(this, authorizationProvider);

            } catch (error) {
                throw new Error(processError(error, localize("createAuthorizationProvider", `Failed to create authorization provider '${authorizationProviderName}'.`)));
            }
        } else {
            throw Error("Expected Authorization Provider information.");
        }
    }
 }
