/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { AuthorizationsTreeItem, IAuthorizationTreeItemContext } from "../explorer/AuthorizationsTreeItem";
import { AuthorizationProviderTreeItem } from "../explorer/AuthorizationProviderTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function createAuthorization(context: IActionContext & Partial<IAuthorizationTreeItemContext>, node?: AuthorizationsTreeItem): Promise<void> {
    if (!node) {
        const authorizationProviderNode = <AuthorizationProviderTreeItem>await ext.tree.showTreeItemPicker(AuthorizationProviderTreeItem.contextValue, context);
        node = authorizationProviderNode.authorizationsTreeItem;
    }
    
    const authorizationName = await askInput('Enter Authorization name ...');
    context.authorizationName = authorizationName;

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingAuthorization", `Creating Authorization '${authorizationName}' for Authorization Provider ${node.root.authorizationProviderName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { 
            return node!.createChild(context); 
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("createdAuthorization", `Created Authorization '${authorizationName}' in API Management succesfully.`));
    });
}

async function askInput(message: string) : Promise<string> {
    const idPrompt: string = localize('value', message);
    return (await ext.ui.showInputBox({
        prompt: idPrompt
    })).trim();
}