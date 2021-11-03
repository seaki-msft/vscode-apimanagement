/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { IAuthorizationProviderTreeItemContext, AuthorizationProvidersTreeItem } from "../explorer/AuthorizationProvidersTreeItem";
import { IServiceProviderParameterContract } from "../azure/apim/contracts";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { ApimService } from "../azure/apim/ApimService"

export async function createAuthorizationProvider(context: IActionContext & Partial<IAuthorizationProviderTreeItemContext>, node?: AuthorizationProvidersTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.authorizationProvidersTreeItem;
    }

    const authorizationProviderName = await askInput('Enter Authorization Provider name ...');
    context.authorizationProviderName = authorizationProviderName;

    const apimService = new ApimService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, node.root.resourceGroupName, node.root.serviceName);
    // TODO(seaki): add caching
    const options = await apimService.listServiceProviders();
    const choice = await ext.ui.showQuickPick(options.map((s) => { return { label: s.Id, description: '', detail: '' }; }), { placeHolder: 'Select Identity Provider ...', canPickMany: false });

    const selectedIdentityProvider = options.find(s => s.Id == choice.label)!;
    context.identityProvider = choice.label;

    const parameters: IParameterValues = {};
    for (var param of selectedIdentityProvider?.Parameters) {
        parameters[param.Name] = await askIdentityProviderParameterInput(param);
    }

    // Some IDPs don't have scopes. Ask explicitly if so
    if (selectedIdentityProvider?.Parameters.findIndex(p => p.Name == "scopes") == -1) {
        parameters["scopes"] = await askInput("Enter scopes...");
    }

    context.parameters = parameters;

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingAuthorizationProvider", `Creating AuthorizationProvider '${authorizationProviderName}' in API Management service ${node.root.serviceName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { return node!.createChild(context); }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("creatingAuthorizationProvider", `Created AuthorizationProvider '${authorizationProviderName}' in API Management succesfully.`));
    });
}

async function askIdentityProviderParameterInput(param: IServiceProviderParameterContract) : Promise<string> {
    var promptString = `Enter ${param.DisplayName}... `;
    var additional = "("
    if (!!param.Description) {
        additional += `${param.Description}. `; 
    } 
    if (!!param.Default) {
        additional += `Default is ${param.Default}`;
    }
    additional += ")";
    if (additional.length > 2) {
        promptString += additional;
    }

    var value = await askInput(promptString);
    if (!value) {
        value = param.Default;
    }
    return value;
}

async function askInput(message: string) : Promise<string> {
    const idPrompt: string = localize('value', message);
    return (await ext.ui.showInputBox({
        prompt: idPrompt
    })).trim();
}

interface IParameterValues {
    [name: string]: string;
}