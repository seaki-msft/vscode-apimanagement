/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import { AuthorizationTreeItem } from "../explorer/AuthorizationTreeItem";
import { ext } from "../extensionVariables";
import { localize } from '../localize';

export async function copyAuthorizationPolicy(context: IActionContext, node?: AuthorizationTreeItem): Promise<void> {
    if (!node) {
        const authorizationNode = <AuthorizationTreeItem>await ext.tree.showTreeItemPicker(AuthorizationTreeItem.contextValue, context);
        node = authorizationNode;
    }

    const pid = node.root.authorizationProviderName;
    const aid = node.authorizationContract.name;

    vscode.env.clipboard.writeText(`<get-authorization-context provider-id="${pid}" authorization-id="${aid}" context-variable-name="${pid}-${aid}-context" identity-type="managed" ignore-error="true" />
<set-header name="Authorization" exists-action="override">
    <value>@("Bearer " + ((Authorization)context.Variables.GetValueOrDefault("${pid}-${aid}-context"))?.AccessToken)</value>
</set-header>`);
    vscode.window.showInformationMessage(localize("CopySnippet", `Policy copied to clipboard.`));
}