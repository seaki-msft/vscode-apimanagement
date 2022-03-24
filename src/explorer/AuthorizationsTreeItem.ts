/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzureParentTreeItem, ICreateChildImplContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationContract } from "../azure/apim/contracts";
import { authorizeAuthorization } from "../commands/authorizeAuthorization";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { AuthorizationTreeItem } from "./AuthorizationTreeItem";
import { IAuthorizationProviderTreeRoot } from "./IAuthorizationProviderTreeRoot";

export interface IAuthorizationTreeItemContext extends ICreateChildImplContext {
    authorizationName: string;
}

export class AuthorizationsTreeItem extends AzureParentTreeItem<IAuthorizationProviderTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementAuthorizations';
    public label: string = "Authorizations";
    public contextValue: string = AuthorizationsTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.Authorization', 'Authorization');
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

        const gatewayApis: IAuthorizationContract[] = await apimService.listAuthorizations(this.root.authorizationProviderName);

        return this.createTreeItemsWithErrorHandling(
            gatewayApis,
            "invalidApiManagementAuthorization",
            async (authorization: IAuthorizationContract) => new AuthorizationTreeItem(this, authorization),
            (authorization: IAuthorizationContract) => {
                return authorization.name;
            });
    }

    public async createChildImpl(context: IAuthorizationTreeItemContext): Promise<AuthorizationTreeItem> {
        if (context.authorizationName) {
            const authorizationName = context.authorizationName;
            context.showCreatingTreeItem(authorizationName);

            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);                
                const authorization = await apimService.createAuthorization(this.root.authorizationProviderName, authorizationName);

                // Automatically create permission for logged in user
                const token = await this.root.credentials.getToken();
                if (!!token) {
                    await apimService.createAuthorizationPermission(this.root.authorizationProviderName, authorizationName, token.userId!, token.oid!, token.tenantId!)
                }

                var node = new AuthorizationTreeItem(this, authorization);
                await authorizeAuthorization(context, node); // automatically start authorization flow
                return node;
            } catch (error) {
                throw new Error(processError(error, localize("createAuthorization", `Failed to add authorization '${authorizationName}' to authorizationProvider '${this.root.authorizationProviderName}'.`)));
            }
        } else {
            throw Error("Expected Authorization name.");
        }
    }
}
