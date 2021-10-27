/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpOperationResponse, ServiceClient } from "@azure/ms-rest-js";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { createGenericClient } from "vscode-azureextensionui";
import { IConnectionContract, IGatewayApiContract, IGatewayContract, ILoginLinkRequestContract, ILoginLinkResponseContract, IMasterSubscription, ITokenProviderContract, ITokenProviderPropertyContract } from "./contracts";

export class ApimService {
    public baseUrl: string;
    public credentials: TokenCredentialsBase;
    public endPointUrl: string;
    public subscriptionId: string;
    public resourceGroup: string;
    public serviceName: string;
    private readonly apiVersion: string = "2018-06-01-preview";
    private readonly tokenServiceApiVersion: string = "2021-04-01-preview";

    constructor(credentials: TokenCredentialsBase, endPointUrl: string, subscriptionId: string, resourceGroup: string, serviceName: string) {
        this.baseUrl = this.genSiteUrl(endPointUrl, subscriptionId, resourceGroup, serviceName);
        this.credentials = credentials;
        this.endPointUrl = endPointUrl;
        this.subscriptionId = subscriptionId;
        this.resourceGroup = resourceGroup;
        this.serviceName = serviceName;
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

    public async listTokenProviders(): Promise<ITokenProviderContract[]> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders?api-version=${this.tokenServiceApiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <ITokenProviderContract[]>(result.parsedBody.value);
    }

    public async listConnections(tokenProviderName: string): Promise<IConnectionContract[]> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders/${tokenProviderName}/authorizations?api-version=${this.tokenServiceApiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IConnectionContract[]>(result.parsedBody.value);
    }

    public async createTokenProvider(tokenProviderName:string, identityProvider: string, clientId: string, clientSecret: string, scopes: string = '', parameters : {[name: string]: string;} = {}): Promise<ITokenProviderContract> {
        const client: ServiceClient = await createGenericClient(this.credentials);

        const properties: ITokenProviderPropertyContract = {
            displayName: tokenProviderName,
            identityProvider: identityProvider,
            OAuthSettings : {
                ClientId: clientId,
                ClientSecret: clientSecret,
                Scopes: scopes,
                Parameters : parameters
            }
        }
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/authorizationProviders/${tokenProviderName}?api-version=${this.tokenServiceApiVersion}`,
            body: { properties: properties }
        });
        // tslint:disable-next-line: no-unsafe-any
        return <ITokenProviderContract>(result.parsedBody);
    }

    public async createConnection(tokenProviderName: string, connectionName: string): Promise<IConnectionContract> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/authorizationProviders/${tokenProviderName}/authorizations/${connectionName}?api-version=${this.tokenServiceApiVersion}`,
            body: {}
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IConnectionContract>(result.parsedBody);
    }

    public async deleteConnection(tokenProviderName: string, connectionName: string): Promise<void> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/authorizationProviders/${tokenProviderName}/authorizations/${connectionName}?api-version=${this.tokenServiceApiVersion}`
        });
    }

    public async deleteTokenProvider(tokenProviderName: string): Promise<void> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/authorizationProviders/${tokenProviderName}?api-version=${this.tokenServiceApiVersion}`
        });
    }

    public async getLoginLink(tokenProviderName: string, connectionName: string, body: ILoginLinkRequestContract) : Promise<ILoginLinkResponseContract> {
        const client: ServiceClient = await createGenericClient(this.credentials);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "POST",
            url: `${this.baseUrl}/authorizationProviders/${tokenProviderName}/authorizations/${connectionName}/getLoginLinks?api-version=${this.tokenServiceApiVersion}`,
            body: body
        });
        // tslint:disable-next-line: no-unsafe-any
        return <ILoginLinkResponseContract>(result.parsedBody);
    }
}
