/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URLSearchParams } from 'url';
import * as vscode from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from '../azure/apim/ApimService';
import { ILoginLinkRequestContract } from '../azure/apim/contracts';
import { AuthorizationTreeItem } from "../explorer/AuthorizationTreeItem";
import { ext } from "../extensionVariables";
import { localize } from '../localize';

export const authorizeAuthorizationCallbackPath = "authorize-authorization-callback";

export async function authorizeAuthorization(context: IActionContext, node?: AuthorizationTreeItem): Promise<void> {
    if (!node) {
        const authorizationNode = <AuthorizationTreeItem>await ext.tree.showTreeItemPicker(AuthorizationTreeItem.contextValue, context);
        node = authorizationNode;
    }

    const extensionId = "ms-azuretools.vscode-apimanagement";
    const postLoginRedirectUrl = `vscode://${extensionId}/${authorizeAuthorizationCallbackPath}`;

    const apimService = new ApimService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, node.root.resourceGroupName, node.root.serviceName);
    
    const requestBody: ILoginLinkRequestContract = {
        postLoginRedirectUrl: postLoginRedirectUrl
    };

    const loginLinkResponse = await apimService.getLoginLink(node.root.authorizationProviderName, node.authorizationContract.name, requestBody);
    vscode.env.openExternal(vscode.Uri.parse(loginLinkResponse.loginLink));
}

export async function authorizeAuthorizationCallback(queryString : string) {
    const errorEncoded = new URLSearchParams(queryString).get("error");
    if (!errorEncoded) {
        ext.outputChannel.appendLine(localize('oauthFlowComplete', "OAuth flow completed."));
        vscode.window.showInformationMessage(localize('authSuccess', 'Authorization complete. You can now close the browser window that was launched during the authorization process.'));
        // TODO(seaki): refresh node    
    } else {
        const errorDecoded = Buffer.from(errorEncoded, 'base64');
        ext.outputChannel.appendLine(localize('oauthFlowFailed', `OAuth flow failed with the following error: ${errorDecoded}`));
        vscode.window.showInformationMessage(localize('authSuccess', `Authorization failed with the following error. ${errorDecoded}`));
    }
}