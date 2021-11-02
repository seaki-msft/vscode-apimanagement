/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, UserCancelledError } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationPermissionContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IAuthorizationTreeRoot } from "./IAuthorizationTreeRoot";

export class AuthorizationPermissionTreeItem extends AzureTreeItem<IAuthorizationTreeRoot> {
    public static contextValue: string = 'azureApiManagementAuthorizationPermission';
    public contextValue: string = AuthorizationPermissionTreeItem.contextValue;
    private _label: string;

    constructor(
        parent: AzureParentTreeItem,
        public readonly authorizationPermissionContract: IAuthorizationPermissionContract) {
        super(parent);
        this._label = nonNullProp(authorizationPermissionContract, 'name');
    }

    public get label() : string {
        return this._label;
    }

    public get description(): string | undefined {
        return this.authorizationPermissionContract.properties.ObjectId;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('op');
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmAuthorizationPermissionRemove", `Are you sure you want to remove permission '${this.authorizationPermissionContract.name}' from authorization '${this.root.authorizationName}'?`)
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("removingAuthorizationPermission", `Removing permission "${this.authorizationPermissionContract.name}" from Authorization '${this.root.authorizationName}.'`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                await apimService.deleteAuthorizationPermission(this.root.authorizationProviderName, this.root.authorizationName, nonNullProp(this.authorizationPermissionContract, "name"));
            });
            // don't wait
            window.showInformationMessage(localize("removedAuthorizationPermission", `Successfully removed permission "${this.authorizationPermissionContract.name}" from Authorization '${this.root.authorizationName}'.`));

        } else {
            throw new UserCancelledError();
        }
    }
}
