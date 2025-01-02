export interface CredSalts {
    interests: string;
    reputationTags: string;
    badges: string;
    collections: string;
}
export interface AttestCred {
    interests: string[];
    reputationTags: string[];
    badges: string[];
    collections: string[];
    attestation: any;
    salt: CredSalts;
}
export interface ConnectedProfiles {
    platformType: string;
    userPlatformId: string;
    username?: string;
}
export interface AttestedPlatformIds {
    connectedProfiles: ConnectedProfiles[];
    attestation: any;
    salt: any;
}
//# sourceMappingURL=interfaces.d.ts.map