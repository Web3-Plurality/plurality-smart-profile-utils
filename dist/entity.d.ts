interface CredSalts {
    interests: string;
    reputationTags: string;
    badges: string;
    collections: string;
}
interface ConnectedProfiles {
    platformType: string;
    userPlatformId: string;
    username?: string;
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
export {};
//# sourceMappingURL=entity.d.ts.map