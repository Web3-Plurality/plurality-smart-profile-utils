interface LinkedAddress {
    chainName: string;
    chainId: number;
    address: string;
}
interface ConnectedProfiles {
    platformType: string;
    userPlatformId: string;
    username?: string;
}
interface ExtendedPrivateData {
    field: string;
    value: string;
}
interface CredSalts {
    interests: string;
    reputationTags: string;
    badges: string;
    collections: string;
}
export declare class AttestCred {
    interests: string[];
    reputationTags: string[];
    badges: string[];
    collections: string[];
    attestation: any;
    salt: CredSalts;
    constructor();
}
export declare class AttestedPlatformIds {
    connectedProfiles: ConnectedProfiles[];
    attestation: any;
    salt: any;
    constructor();
}
export declare class ProfilePrivateData {
    attestedCred: AttestCred;
    attestedPlatformIds: AttestedPlatformIds;
    linkedAddress: LinkedAddress[];
    extendedPrivateData: ExtendedPrivateData[];
    constructor();
}
export {};
//# sourceMappingURL=profile-private-data.d.ts.map