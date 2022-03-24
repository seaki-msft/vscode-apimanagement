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
        { placeHolder: 'Which identity type do you want to use?', canPickMany: false, suppressPersistence: true });

    const pid = node.root.authorizationProviderName;
    const aid = node.authorizationContract.name;

    if (identityTypeSelected.label == managed) {
        // TODO(seaki): error if managed identity is not turned on or permission has not been created
        var comment = `<!-- Add to the inbound policy -->`;
        var identityPhrase = `identity-type="${identityTypeSelected.label}"`;
        var additionalMessage = "For 'managed' identity-type, make sure managed identity is turned on."
    } else {
        var allowedAudienceMessage = `Allowed audiences for jwt in "identity" attribute are "https://management.core.windows.net/" and "https://apihub.azure.com/"`;
        var comment = `<!-- Add to the inbound policy. ${allowedAudienceMessage} -->`;
        var identityPhrase = `identity-type="${identityTypeSelected.label}" identity="@(context.Request.Headers["Authorization"][0].Replace("Bearer ", ""))"`;
        var additionalMessage = `For 'jwt' identity-type, ${allowedAudienceMessage}`;
    }

    if (purposeSelected.label == attachToken) {
        var policy = `${comment}
<get-authorization-context 
    provider-id="${pid}"
    authorization-id="${aid}" 
    context-variable-name="${pid}-${aid}-context" 
    ignore-error="false" 
    ${identityPhrase} />
<set-header name="Authorization" exists-action="override">
    <value>@("Bearer " + ((Authorization)context.Variables.GetValueOrDefault("${pid}-${aid}-context"))?.AccessToken)</value>
</set-header>`
    } else {
        var policy = `${comment}
<get-authorization-context 
    provider-id="${pid}" 
    authorization-id="${aid}" 
    context-variable-name="${pid}-${aid}-context" 
    ignore-error="false" 
    ${identityPhrase} />
<return-response>
    <set-status code="200" />
    <set-body template="none">@(((Authorization)context.Variables.GetValueOrDefault("${pid}-${aid}-context"))?.AccessToken)</set-body>
</return-response>`;
    }

    vscode.env.clipboard.writeText(policy);
    vscode.window.showInformationMessage(localize("CopySnippet", `Policy copied to clipboard. ${additionalMessage}`));
    ext.outputChannel.appendLine(`Policy copied to clipboard. ${additionalMessage}`);
}