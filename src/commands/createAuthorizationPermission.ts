/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { AuthorizationPermissionsTreeItem, IAuthorizationPermissionTreeItemContext } from "../explorer/AuthorizationPermissionsTreeItem";
import { AuthorizationTreeItem } from "../explorer/AuthorizationTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function createAuthorizationPermission(context: IActionContext & Partial<IAuthorizationPermissionTreeItemContext>, node?: AuthorizationPermissionsTreeItem): Promise<void> {
    if (!node) {
        const AuthorizationNode = <AuthorizationTreeItem>await ext.tree.showTreeItemPicker(AuthorizationTreeItem.contextValue, context);
        node = AuthorizationNode.authorizationPermissionsTreeItem;
    }
    
    const permissionName = await askInput('Enter Permission name ...');
    context.permissionName = permissionName;

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingAuthorizationPermission", `Creating AuthorizationPermission '${permissionName}' for Authorization ${node.root.authorizationName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { 
            return node!.createChild(context); 
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("createdAuthorizationPermission", `Created permission '${permissionName}' in API Management succesfully.`));
    });
}

async function askInput(message: string) : Promise<string> {
    const idPrompt: string = localize('value', message);
    return (await ext.ui.showInputBox({
        prompt: idPrompt
    })).trim();
}