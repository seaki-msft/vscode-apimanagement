/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { AzExtTreeItem, AzureParentTreeItem, ICreateChildImplContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationPermissionContract } from "../azure/apim/contracts";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { AuthorizationPermissionTreeItem } from "./AuthorizationPermissionTreeItem";
import { IAuthorizationTreeRoot } from "./IAuthorizationTreeRoot";

export interface IAuthorizationPermissionTreeItemContext extends ICreateChildImplContext {
    permissionName: string;
    objectId: string;
    tenantId: string;
}

export class AuthorizationPermissionsTreeItem extends AzureParentTreeItem<IAuthorizationTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementAuthorizationPermissions';
    public label: string = "Permissions";
    public contextValue: string = AuthorizationPermissionsTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.AuthorizationPermission', 'AuthorizationPermission');
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

        const authorizationPermissions: IAuthorizationPermissionContract[] = await apimService.listAuthorizationPermissions(this.root.authorizationProviderName, this.root.authorizationName);

        return this.createTreeItemsWithErrorHandling(
            authorizationPermissions,
            "invalidApiManagementAuthorizationPermission",
            async (authorizationPermission: IAuthorizationPermissionContract) => new AuthorizationPermissionTreeItem(this, authorizationPermission),
            (authorizationPermission: IAuthorizationPermissionContract) => {
                return authorizationPermission.name;
            });
    }

    public async createChildImpl(context: IAuthorizationPermissionTreeItemContext): Promise<AuthorizationPermissionTreeItem> {
        if (context.permissionName && context.objectId && context.tenantId) {
            const permissionName = context.permissionName;
            context.showCreatingTreeItem(permissionName);
            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                const permission = await apimService.createAuthorizationPermission(this.root.authorizationProviderName, this.root.authorizationName, context.permissionName, context.objectId, context.tenantId);
                const message = `Successfully created permission "${permission.name}".`;

                ext.outputChannel.show();
                ext.outputChannel.appendLine(message);
                
                window.showInformationMessage(localize("createdAuthorizationPermission", message));

                return new AuthorizationPermissionTreeItem(this, permission);

            } catch (error) {
                throw new Error(processError(error, localize("createdAuthorizationPermission", `Failed to create permission '${permissionName}'.`)));
            }
        } else {
            throw Error("Expected Authorization Permission information.");
        }
    }
 }
