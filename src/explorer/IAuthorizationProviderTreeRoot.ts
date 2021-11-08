/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { IAuthorizationProviderPropertyContract } from "../azure/apim/contracts";

export interface IAuthorizationProviderTreeRoot extends IServiceTreeRoot {
    authorizationProviderName: string;
    authorizationProperties: IAuthorizationProviderPropertyContract;
}
