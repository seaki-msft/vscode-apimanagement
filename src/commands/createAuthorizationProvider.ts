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
    const choice = await ext.ui.showQuickPick(options.map((s) => { return { label: s.id, description: '', detail: '' }; }), { placeHolder: 'Select Identity Provider ...', canPickMany: false });

    const selectedIdentityProvider = options.find(s => s.id == choice.label)!;
    context.identityProvider = choice.label;

    const parameters: IParameterValues = {};

    // Required parameters
    const requiredParamIds = [ "clientId", "clientSecret", "scopes" ];
    const requiredParamNames = [ "Client Id", "Client Secret", "Scopes" ];
    for (var idx=0; idx<requiredParamIds.length; idx++) {
        var paramId = requiredParamIds[idx];
        var paramName = requiredParamNames[idx];
        context[paramId] = await askInput(`Enter ${paramName}...`);
    }

    for (var param of selectedIdentityProvider?.parameters) {
        if (requiredParamIds.findIndex(p => p.toLowerCase() == param.name.toLowerCase()) == -1) {
            parameters[param.name] = await askIdentityProviderParameterInput(param);
        }
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
        window.showInformationMessage(localize("creatingAuthorizationProvider", `Created AuthorizationProvider '${authorizationProviderName}' in API Management successfully.`));
    });
}

async function askIdentityProviderParameterInput(param: IServiceProviderParameterContract) : Promise<string> {
    var promptString = `Enter ${param.displayName}... `;
    var additional = "("
    if (!!param.description) {
        additional += `${param.description}. `; 
    } 
    if (!!param.default) {
        additional += `Default is '${param.default}'`;
    }
    additional += ")";
    if (additional.length > 2) {
        promptString += additional;
    }

    var value = await askInput(promptString);
    if (!value) {
        value = param.default;
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