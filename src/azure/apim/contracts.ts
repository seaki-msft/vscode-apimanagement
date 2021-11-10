/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IGatewayContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IGatewayPropertyContract;
}

export interface IGatewayPropertyContract {
    region: string;
    heartbeat: string;
}

export interface IGatewayApiContract {
    id: string;
    name: string;
}

export interface IGatewayToken {
    value: string;
}

export interface IGatewayTokenList {
    primary: string;
    secondary: string;
}

export interface IMasterSubscription {
    id : string;
    name : string;
    properties: ISubscriptionProperty;
}

export interface ISubscriptionProperty {
    displayName: string;
    primaryKey: string;
    secondaryKey: string;
}

export interface IServiceProvidersContract {
    values: IServiceProviderContract[];
}

export interface IServiceProviderContract {
    id: string;
    displayName: string;
    authenticationType: string;
    parameters: IServiceProviderParameterContract[];
}

export interface IServiceProviderParameterContract {
    name: string;
    displayName: string;
    description: string;
    default: string;
}

export interface IAuthorizationProviderContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IAuthorizationProviderPropertyContract;
}

export interface IAuthorizationProviderPropertyContract {
    displayName: string;
    identityProvider: string;
    oauthSettings: {
        clientId: string;
        clientSecret: string;
        scopes?: string;
        redirectUrl?: string;
        parameters?: {}
    };
}

export interface IAuthorizationContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IAuthorizationPropertyContract;
}

export interface IAuthorizationPropertyContract {
    status: string; // TODO(seaki): switch to enum?
    error: {
        code: string;
        message: string;
    };
}

export interface IAuthorizationPermissionContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IAuthorizationPermissionPropertyContract;
}

export interface IAuthorizationPermissionPropertyContract {
    objectId: string;
    tenantId: string;
}

export interface ILoginLinkRequestContract {
    postLoginRedirectUrl: string;
}

export interface ILoginLinkResponseContract {
    loginLink: string;
}