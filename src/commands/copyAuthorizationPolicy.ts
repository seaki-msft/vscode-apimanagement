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

    // Select purpose
    var attachToken = "Attach the access token to the backend call";
    var tokenBack = "Get the access token back";
    var purposeOptions = [ attachToken, tokenBack ];
    const purposeSelected = await ext.ui.showQuickPick(
        purposeOptions.map(purpose => { return { label: purpose, description: '', detail: '' }; }), 
        { placeHolder: 'How do you want to use the policy?', canPickMany: false });
    
    // Select identity 
    var managed = "managed";
    var jwt = "jwt";
    var identityTypeOptions = [
        {
            label: managed,
            description: "Use the managed identity of the APIM service."
        },
        {
            label: jwt,
            description: "Use the identity of the specified token."
        }
    ]
    const identityTypeSelected = await ext.ui.showQuickPick(
        identityTypeOptions.map(option => { return { label: option.label, description: option.description, detail: '' }; }), 
        { placeHolder: 'Which identity type do you want to use?', canPickMany: false });

    const pid = node.root.authorizationProviderName;
    const aid = node.authorizationContract.name;

    if (identityTypeSelected.label == managed) {
        var identityPhrase = `identity-type=${identityTypeSelected.label}`;
    } else {
        var identityPhrase = `identity-type=${identityTypeSelected.label} identity={jwt with audience="https://management.core.windows.net/"}`
    }

    if (purposeSelected.label == attachToken) {
        var policy = `<!-- Add to the inbound policy -->
<get-authorization-context provider-id="${pid}" authorization-id="${aid}" context-variable-name="${pid}-${aid}-context" ignore-error="true" ${identityPhrase} />
<set-header name="Authorization" exists-action="override">
    <value>Bearer @((Authorization)@(((Authorization)context.Variables.GetValueOrDefault("${pid}-${aid}-context"))?.AccessToken)</value>
</set-header>`
    } else {
        var policy = `<!-- Add to the outbound policy -->
<get-authorization-context provider-id="${pid}" authorization-id="${aid}" context-variable-name="${pid}-${aid}-context" ignore-error="true" ${identityPhrase} />
<set-body template="none">@(((Authorization)context.Variables.GetValueOrDefault("authContext"))?.AccessToken)</set-body>`;
    }

    vscode.env.clipboard.writeText(policy);
    vscode.window.showInformationMessage(localize("CopySnippet", `Policy copied to clipboard.`));
}