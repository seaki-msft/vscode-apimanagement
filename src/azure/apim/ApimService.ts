/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpOperationResponse, ServiceClient } from "@azure/ms-rest-js";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { createGenericClient } from "vscode-azureextensionui";
import { 
    IAuthorizationContract, IGatewayApiContract, IGatewayContract, ILoginLinkRequestContract, ILoginLinkResponseContract, IMasterSubscription, 
    IAuthorizationProviderContract, IAuthorizationProviderPropertyContract, IAuthorizationPermissionContract, IAuthorizationPermissionPropertyContract,
    IServiceProviderContract, IApimServiceContract} from "./contracts";

export class ApimService {
    public baseUrl: string;
    public credentials: TokenCredentialsBase;
    public endPointUrl: string;
    public subscriptionId: string;
    public resourceGroup: string;
    public serviceName: string;
    private readonly apiVersion: string = "2018-06-01-preview";
    private readonly authorizationProviderApiVersion: string = "2021-04-01-preview";

    constructor(credentials: TokenCredentialsBase, endPointUrl: string, subscriptionId: string, resourceGroup: string, serviceName: string) {
        this.baseUrl = this.genSiteUrl(endPointUrl, subscriptionId, resourceGroup, serviceName);
        this.credentials = credentials;
        this.endPointUrl = endPointUrl;
        this.subscriptionId = subscriptionId;
        this.resourceGroup = resourceGroup;
        this.serviceName = serviceName;
    }

    public async getService(): Promise<IApimServiceContract> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}?api-version=${this.apiVersion}`
        });
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IApimServiceContract>(result.parsedBody);
    }

    public async turnOnManagedIdentity(): Promise<IApimServiceContract> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PATCH",
            url: `${this.baseUrl}?api-version=${this.apiVersion}`,
            body: { identity : { type: "systemassigned" } }
        });
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IApimServiceContract>(result.parsedBody);
    }

    public async listGateways(): Promise<IGatewayContract[]> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/gateways?api-version=${this.apiVersion}&$top=100`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IGatewayContract[]>(result.parsedBody.value);
    }

    public async listGatewayApis(gatewayName: string): Promise<IGatewayApiContract[]> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/gateways/${gatewayName}/apis?api-version=${this.apiVersion}&$top=100`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IGatewayApiContract[]>(result.parsedBody.value);
    }

    public async createGatewayApi(gatewayName: string, apiName: string): Promise<IGatewayApiContract> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/gateways/${gatewayName}/apis/${apiName}?api-version=${this.apiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IGatewayApiContract>(result.parsedBody);
    }

    public async deleteGatewayApi(gatewayName: string, apiName: string): Promise<void> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/gateways/${gatewayName}/apis/${apiName}?api-version=${this.apiVersion}`
        });
    }

    public async generateNewGatewayToken(gatewayName: string, numOfDays: number, keyType: string): Promise<string> {
        const now = new Date();
        const timeSpan = now.setDate(now.getDate() + numOfDays);
        const expiryDate = (new Date(timeSpan)).toISOString();
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "POST",
            url: `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}/providers/Microsoft.ApiManagement/service/${this.serviceName}/gateways/${gatewayName}/token?api-version=2018-06-01-preview`,
            body: {
                keyType: keyType,
                expiry: expiryDate
            }
        });
        // tslint:disable-next-line: no-unsafe-any
        return result.parsedBody.value;
    }

    public async getSubscriptionMasterkey(): Promise<IMasterSubscription> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/subscriptions/master?api-version=${this.apiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return result.parsedBody;
    }

    private genSiteUrl(endPointUrl: string, subscriptionId: string, resourceGroup: string, serviceName: string): string {
        return `${endPointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ApiManagement/service/${serviceName}`;
    }

    public async listServiceProviders(): Promise<IServiceProviderContract[]> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/serviceProviders?api-version=${this.authorizationProviderApiVersion}`
        });
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IServiceProviderContract[]>(result.parsedBody.value);
    }

    public async listAuthorizationProviders(): Promise<IAuthorizationProviderContract[]> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders?api-version=${this.authorizationProviderApiVersion}`
        });
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationProviderContract[]>(result.parsedBody.value);
    }

    public async createAuthorizationProvider(
        authorizationProviderName:string, 
        identityProvider: string, 
        clientId: string,
        clientSecret: string,
        scopes: string,
        parameters : {[name: string]: string;} = {}): Promise<IAuthorizationProviderContract> {
        const client: ServiceClient = await createGenericClient(this.credentials);

        const properties: IAuthorizationProviderPropertyContract = {
            displayName: authorizationProviderName,
            identityProvider: identityProvider,
            oauthSettings : {
                clientId: clientId,
                clientSecret: clientSecret,
                scopes: scopes,
                parameters : parameters
            }
        }
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}?api-version=${this.authorizationProviderApiVersion}`,
            body: { properties: properties }
        });
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationProviderContract>(result.parsedBody);
    }

    public async deleteAuthorizationProvider(authorizationProviderName: string): Promise<void> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}?api-version=${this.authorizationProviderApiVersion}`
        });
    }
    
    public async listAuthorizations(authorizationProviderName: string): Promise<IAuthorizationContract[]> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations?api-version=${this.authorizationProviderApiVersion}`
        });
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationContract[]>(result.parsedBody.value);
    }

    public async createAuthorization(authorizationProviderName: string, authorizationId: string): Promise<IAuthorizationContract> {
        // TODO(seaki): until managed identity is not required, automatically turn on managed identity

        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationId}?api-version=${this.authorizationProviderApiVersion}`,
            body: {}
        });
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationContract>(result.parsedBody);
    }

    public async deleteAuthorization(authorizationProviderName: string, authorizationId: string): Promise<void> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationId}?api-version=${this.authorizationProviderApiVersion}`
        });
    }

    public async getLoginLink(authorizationProviderName: string, authorizationId: string, body: ILoginLinkRequestContract) : Promise<ILoginLinkResponseContract> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "POST",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationId}/getLoginLinks?api-version=${this.authorizationProviderApiVersion}`,
            body: body
        });
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <ILoginLinkResponseContract>(result.parsedBody);
    }
    
    public async listAuthorizationPermissions(authorizationProviderName: string, authorizationName): Promise<IAuthorizationPermissionContract[]> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationName}/permissions?api-version=${this.authorizationProviderApiVersion}`
        });
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationPermissionContract[]>(result.parsedBody.value);
    }

    public async createAuthorizationPermission(authorizationProviderName: string, authorizationId: string, permissionName: string, objectId: string, tenantId: string): Promise<IAuthorizationPermissionContract> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const properties: IAuthorizationPermissionPropertyContract = {
            objectId: objectId,
            tenantId: tenantId
        }
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationId}/permissions/${permissionName}?api-version=${this.authorizationProviderApiVersion}`,
            body: { properties: properties }
        });
        
        if (result.status >= 400) {
            throw Error(result.parsedBody.error?.message);
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationPermissionContract>(result.parsedBody);
    }

    public async deleteAuthorizationPermission(authorizationProviderName: string, authorizationId: string, permissionName: string): Promise<void> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationId}/permissions/${permissionName}?api-version=${this.authorizationProviderApiVersion}`
        });
    }
}
