import { ResolverAddress } from './types';

export const addressResolverName = ({ typeName, fieldName }: ResolverAddress): string => `${typeName}.${fieldName}`;
export const addressFileName = (address: ResolverAddress): string => `${addressResolverName(address)}.js`;
export const functionFileName = (address: ResolverAddress, functionName: string): string => `${addressResolverName(address)}.${functionName}.js`;
