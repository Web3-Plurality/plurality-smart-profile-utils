import { ScoreTypes } from '../utils/global';
import { ProfilePrivateData } from './profile-private-data';


interface Score {
  scoreType: string;
  scoreValue: number;
}

export class SmartProfile {
  username: string;
  avatar: string;
  bio: string;
  scores: Score[]; 
  connectedPlatforms: string[];
  profileTypeStreamId: string; 
  version: string; 
  extendedPublicData: any;
  attestation: any;
  privateData: ProfilePrivateData;

  constructor(data?: any) {
    this.username = data?.username || '';
    this.avatar = data?.avatar || '';
    this.bio = data?.bio || '';
    this.scores = Object.values(ScoreTypes).map((scoreType) => ({
      scoreType: scoreType,
      scoreValue: 0,
    }));
    this.connectedPlatforms = data?.connected_platforms || [];
    this.profileTypeStreamId = data?.profileTypeStreamId || '';
    this.version = '2'; 
    this.attestation = {};
    this.extendedPublicData = {};
    this.privateData = new ProfilePrivateData();
  }

  // You can add methods to manipulate or retrieve the data here
  aggregateProfile(user: SmartProfile) {
    this.privateData.attestedCred.collections = this.privateData.attestedCred.collections.concat(
      user.privateData.attestedCred.collections,
    );
    this.privateData.attestedCred.interests = this.privateData.attestedCred.interests.concat(
      user.privateData.attestedCred.interests,
    );
    this.privateData.attestedCred.reputationTags = this.privateData.attestedCred.reputationTags.concat(
      user.privateData.attestedCred.reputationTags,
    );
    this.privateData.attestedCred.badges = this.privateData.attestedCred.badges.concat(
      user.privateData.attestedCred.badges,
    );
    this.extendedPublicData = {...user.extendedPublicData, ...this.extendedPublicData };
    this.privateData.extendedPrivateData = { ...user.privateData.extendedPrivateData, ...this.privateData.extendedPrivateData }
    const newProfile = user.privateData.attestedPlatformIds.connectedProfiles.filter(
      (profile) => !this.privateData.attestedPlatformIds.connectedProfiles.includes(profile),
    );
    this.privateData.attestedPlatformIds.connectedProfiles =
      this.privateData.attestedPlatformIds.connectedProfiles.concat(newProfile);
    const updatedScores = this.scores.map((score) => {
      const userScore = user.scores.find((us) => us.scoreType === score.scoreType);
      if (userScore) {
        return {
          ...score,
          scoreValue: score.scoreValue + userScore.scoreValue,
        };
      }
      return score;
    });
    // update the score
    this.scores = updatedScores;
  }

  updateScoreValue(scoreType: string, newValue: number) {
    this.scores = this.scores.map((score) => {
      if (score.scoreType === scoreType) {
        return {
          ...score,
          scoreValue: newValue,
        };
      }
      return score;
    });
  }
}
