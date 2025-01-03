import { plainToInstance } from "class-transformer";
import { SmartProfile } from "../entity/smart-profile";
import { AttestedCred, AttestedPlatformIds, ProfilePrivateData } from "../entity/profile-private-data";

export enum ScoreTypes {
    reputationScore = 'reputation_score',
    socialScore = 'social_score',
  }
  
// helper function to normalize smart profile from json to class object
export function normalizeSmartProfile(data: any) {
  const smartProfile = plainToInstance(SmartProfile, JSON.parse(JSON.stringify(data)));
  smartProfile.privateData = plainToInstance(ProfilePrivateData, smartProfile.privateData);
  smartProfile.privateData.attestedCred = plainToInstance(AttestedCred, smartProfile.privateData.attestedCred);
  smartProfile.privateData.attestedPlatformIds = plainToInstance(
    AttestedPlatformIds,
    smartProfile.privateData.attestedPlatformIds,
  );
  return smartProfile;
}