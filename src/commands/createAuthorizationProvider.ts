/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { IAuthorizationProviderTreeItemContext, AuthorizationProvidersTreeItem } from "../explorer/AuthorizationProvidersTreeItem";
import { AuthorizationProviderTreeItem } from "../explorer/AuthorizationProviderTreeItem";
import { IServiceProviderParameterContract, IAuthorizationProviderPropertyContract } from "../azure/apim/contracts";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { ApimService } from "../azure/apim/ApimService"

export async function editAuthorizationProvider(context: IActionContext & Partial<IAuthorizationProviderTreeItemContext>, node?: AuthorizationProviderTreeItem): Promise<void> {
    if (!node) {
        node = <AuthorizationProviderTreeItem>await ext.tree.showTreeItemPicker(AuthorizationProviderTreeItem.contextValue, context);
    }
    
    const apimService = new ApimService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, node.root.resourceGroupName, node.root.serviceName);
    const newContext = await askAuthorizationProviderInput(context, apimService, node.root.authorizationProperties);
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("updatingAuthorizationProvider", `Updating AuthorizationProvider '${newContext.authorizationProviderName}'...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { return apimService.putAuthorizationProvider(node!.root.authorizationProviderName, newContext.identityProvider!, newContext.parameters); }
    ).then(async () => {
        await node!.refresh(newContext);
        window.showInformationMessage(localize("updatedAuthorizationProvider", `Updated AuthorizationProvider '${newContext.authorizationProviderName}' successfully.`));
    });
}

export async function createAuthorizationProvider(context: IActionContext & Partial<IAuthorizationProviderTreeItemContext>, node?: AuthorizationProvidersTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.authorizationProvidersTreeItem;
    }

    const authorizationProviderName = await askInput('Enter Authorization Provider name ...');
    context.authorizationProviderName = authorizationProviderName;

    const apimService = new ApimService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, node.root.resourceGroupName, node.root.serviceName);
    const newContext = await askAuthorizationProviderInput(context, apimService);
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingAuthorizationProvider", `Creating AuthorizationProvider '${newContext.authorizationProviderName}'...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { return node!.createChild(newContext); }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(newContext);
        window.showInformationMessage(localize("createdAuthorizationProvider", `Created AuthorizationProvider '${newContext.authorizationProviderName}' succesfully.`));
    });
}

async function askAuthorizationProviderInput(
    context: IActionContext & Partial<IAuthorizationProviderTreeItemContext>, 
    apimService: ApimService,
    existingAuthorizationProperties: IAuthorizationProviderPropertyContract | undefined = undefined)
    : Promise<IActionContext & Partial<IAuthorizationProviderTreeItemContext>> {

    const options = await apimService.listServiceProviders();
    if (!existingAuthorizationProperties) {
        // TODO(seaki): add caching
        const choice = await ext.ui.showQuickPick(
            options.map((s) => { return { label: s.Id, description: '', detail: '' }; }), 
            { placeHolder: 'Select Identity Provider ...', canPickMany: false });
        context.identityProvider = choice.label;
    }
    else {
        context.identityProvider = existingAuthorizationProperties.IdentityProvider;
    }

    const selectedIdentityProvider = options.find(s => s.Id == context.identityProvider)!;
    const parameters: IParameterValues = {};
    for (var param of selectedIdentityProvider?.Parameters) {
        var paramValue = (existingAuthorizationProperties?.OAuthSettings?.Parameters || {})[param.Name] as string;
        parameters[param.Name] = await askIdentityProviderParameterInput(param, paramValue);
    }

    // Some IDPs don't have scopes. Ask explicitly if so
    if (selectedIdentityProvider?.Parameters.findIndex(p => p.Name == "scopes") == -1) {
        parameters["scopes"] = await askInput("Enter scopes...", undefined);
    }

    context.parameters = parameters;
    return context;
}

async function askIdentityProviderParameterInput(
    param: IServiceProviderParameterContract, paramValue : string | undefined = undefined) : Promise<string> {
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

    var value = await askInput(promptString, paramValue);
    if (!value) {
        value = param.Default;
    }
    return value;
}

async function askInput(message: string, value: string | undefined = undefined) : Promise<string> {
    const idPrompt: string = localize('value', message);
    return (await ext.ui.showInputBox({
        prompt: idPrompt,
        value: value,
    })).trim();
}

interface IParameterValues {
    [name: string]: string;
}