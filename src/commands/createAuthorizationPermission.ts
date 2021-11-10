/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpOperationResponse, ServiceClient } from "@azure/ms-rest-js";
import { ProgressLocation, QuickPickItem, window } from "vscode";
import { createGenericClient, IActionContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { AuthorizationPermissionsTreeItem, IAuthorizationPermissionTreeItemContext } from "../explorer/AuthorizationPermissionsTreeItem";
import { AuthorizationTreeItem } from "../explorer/AuthorizationTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

const customOptionLabel = "Custom...";

export async function createAuthorizationPermission(context: IActionContext & Partial<IAuthorizationPermissionTreeItemContext>, node?: AuthorizationPermissionsTreeItem): Promise<void> {
    if (!node) {
        const AuthorizationNode = <AuthorizationTreeItem>await ext.tree.showTreeItemPicker(AuthorizationTreeItem.contextValue, context);
        node = AuthorizationNode.authorizationPermissionsTreeItem;
    }

    const apimService = new ApimService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, node.root.resourceGroupName, node.root.serviceName);

    const identityOptions = await populateIdentityOptionsAsync(apimService, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, node.root.credentials);
    const identitySelected = await ext.ui.showQuickPick(
        identityOptions.map((option) => { return { label: option.label, description: option.description, detail: option.detail }; }), 
        { placeHolder: 'Select Identity Provider ...', canPickMany: false, suppressPersistence: true });

    if (identitySelected.label != customOptionLabel) {
        var permissionName = identitySelected.label;
        var oid = identitySelected.description!;
    } else {
        // No object id specified; ask explicitly
        var permissionName = await askInput('Enter Permission name ...');
        var oid = await askInput('Enter Object Id ...');
    }

    context.permissionName = permissionName;
    context.objectId = oid;
    context.tenantId = node.root.tenantId;

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingAuthorizationPermission", `Creating Permission '${permissionName}' for Authorization ${node.root.authorizationName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { 
            return node!.createChild(context); 
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("createdAuthorizationPermission", `Created permission '${permissionName}' successfully.`));
    });
}

async function populateIdentityOptionsAsync(apimService: ApimService, resourceManagerEndpointUrl : string, subscriptionId : string, credential) : Promise<QuickPickItem[]> {
    const options : QuickPickItem[] = [];

    // 1. Self
    const token = await credential.getToken();
    const meOption : QuickPickItem = {
        label: token.userId,
        description: token.oid,
        detail: "Current User"
    }
    options.push(meOption);

    // 2. APIM Service
    const service = await apimService.getService();
    if (!!service.identity?.principalId) {
        const apimOption : QuickPickItem = {
            label: service.name,
            description: service.identity.principalId,
            detail: "Current APIM Service"
        }
        options.push(apimOption);
    }

    // 3. Other WebApp Managed identities
    var fetchManagedIdentity = false; // TODO(seaki): remove the flag
    if (fetchManagedIdentity) {
        const client: ServiceClient = await createGenericClient(credential);
        try {
            var response : HttpOperationResponse | undefined = await client.sendRequest({
                method: "POST",
                url: `${resourceManagerEndpointUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2019-04-01`,
                body: {
                    "subscriptions": [ subscriptionId ],
                    "options": { "resultFormat": "objectArray" },
                    "query": "Resources | where type =~ 'Microsoft.Web/sites' | where notempty(identity) | project name, type, identity"
                },
                timeout: 5000 // TODO(seaki): decide on timeout value
            });
        } catch (ex) {
            var response : HttpOperationResponse | undefined = undefined;
        }
        if (response?.status == 200) {
            const managedIdentityOptions : QuickPickItem[] = response.parsedBody.data.where(d => !!d.identity?.principalId).map(d => {
                return {
                    label: d.name, 
                    description: d.identity?.principalId, 
                    detail: d.type
                };
            }); 
            options.push(...managedIdentityOptions);
        }
    }
    
    // 4. Custom
    const customOption : QuickPickItem = {
        label: customOptionLabel,
        description: "",
        detail: "",
    }
    options.push(customOption);
    return options;
}

async function askInput(message: string) : Promise<string> {
    const idPrompt: string = localize('value', message);
    return (await ext.ui.showInputBox({
        prompt: idPrompt
    })).trim();
}