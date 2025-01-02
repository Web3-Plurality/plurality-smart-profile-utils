import { MerkleValueWithSalt } from "@ethereum-attestation-service/eas-sdk";
import { AttestCred, AttestedPlatformIds, ProfilePrivateData } from "./entity/profile-private-data";
import { SmartProfile } from "./entity/smart-profile";
interface Config {
    privateKey: string;
    easContractAddress: string;
    rpcProvider: string;
}
declare class PluralityEas {
    private config;
    constructor(config: Config);
    toMerkleValueWithSalt(attestationObj: AttestCred | AttestedPlatformIds, verification?: boolean): MerkleValueWithSalt[];
    parseAttestation(attestation: any): {
        version: any;
        uid: any;
        domain: {
            name: any;
            version: any;
            chainId: any;
            verifyingContract: any;
        };
        primaryType: any;
        message: {
            version: any;
            recipient: any;
            expirationTime: any;
            time: any;
            revocable: any;
            schema: any;
            refUID: any;
            data: any;
            salt: any;
        };
        types: any;
        signature: any;
    };
    publicOffchainAttestation(profile: SmartProfile, recipientAddress: string, publicSchemaUid: string): Promise<any>;
    privateOffchainAttestations(merkleObj: MerkleValueWithSalt[], recipientAddress: string, privateSchemaUid: string): Promise<any>;
    verifyOffchainAttestation(attestation: any, recipientAddress: string): Promise<boolean>;
    verifyCredAttestation(attestedCred: AttestCred, recipientAddress: string): Promise<boolean>;
    verifyPlatfomIdAttestation(attestedPlatformIds: AttestedPlatformIds, recipientAddress: string): Promise<boolean>;
    attestSmartProfile(id: string, profile: SmartProfile, recipientAddress: string, publicSchemaUid: string, privateSchemaUid: string): Promise<SmartProfile>;
    verifyPublicAttestation(profile: SmartProfile, recipientAddress: string): Promise<boolean>;
    verifyPrivateAttestation(privateData: ProfilePrivateData, recipientAddress: string): Promise<boolean>;
}
declare function normalizeSmartProfile(data: any): SmartProfile;
export { PluralityEas, SmartProfile, AttestCred, AttestedPlatformIds, ProfilePrivateData, normalizeSmartProfile, };
//# sourceMappingURL=index.d.ts.map