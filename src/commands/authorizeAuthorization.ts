/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from '../azure/apim/ApimService';
import { ILoginLinkRequestContract } from '../azure/apim/contracts';
import { AuthorizationTreeItem } from "../explorer/AuthorizationTreeItem";
import { ext } from "../extensionVariables";

export async function authorizeAuthorization(context: IActionContext, node?: AuthorizationTreeItem): Promise<void> {
    if (!node) {
        const authorizationNode = <AuthorizationTreeItem>await ext.tree.showTreeItemPicker(AuthorizationTreeItem.contextValue, context);
        node = authorizationNode;
    }

    const extensionId = "ms-azuretools.vscode-apimanagement";
    const postLoginRedirectUrl = `vscode://${extensionId}`;

    const apimService = new ApimService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, node.root.resourceGroupName, node.root.serviceName);
    
    const requestBody: ILoginLinkRequestContract = {
        postLoginRedirectUrl: postLoginRedirectUrl
    };

    const loginLinkResponse = await apimService.getLoginLink(node.root.authorizationProviderName, node.authorizationContract.name, requestBody);
    vscode.env.openExternal(vscode.Uri.parse(loginLinkResponse.loginLink));
}