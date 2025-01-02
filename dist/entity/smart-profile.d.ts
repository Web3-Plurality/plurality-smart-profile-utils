import { ProfilePrivateData } from './profile-private-data';
interface Score {
    scoreType: string;
    scoreValue: number;
}
interface ExtendedPublicData {
    field: string;
    value: string;
}
export declare enum ScoreTypes {
    reputationScore = "reputation_score",
    socialScore = "social_score"
}
export declare class SmartProfile {
    username: string;
    avatar: string;
    bio: string;
    scores: Score[];
    connectedPlatforms: string[];
    profileTypeStreamId: string;
    version: string;
    extendedPublicData: ExtendedPublicData[];
    attestation: any;
    privateData: ProfilePrivateData;
    constructor(data?: any);
    aggregateProfile(user: SmartProfile): void;
    updateScoreValue(scoreType: string, newValue: number): void;
}
export {};
//# sourceMappingURL=smart-profile.d.ts.map