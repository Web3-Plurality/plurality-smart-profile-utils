import { ProfilePrivateData } from './profile-private-data';

interface Score {
  scoreType: string;
  scoreValue: number;
}

interface ExtendedPublicData {
  field: string;
  value: string;
}

// scores Field -> this should go to database if we convert to microservice
export enum ScoreTypes {
  reputationScore = 'reputation_score',
  socialScore = 'social_score',
}

export class SmartProfile {
  username: string;
  avatar: string;
  bio: string;
  scores: Score[]; // attest
  connectedPlatforms: string[];
  profileTypeStreamId: string; // when should we have to put this
  version: string; // when should we have to put this
  extendedPublicData: ExtendedPublicData[];
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
    this.profileTypeStreamId = '';
    this.version = '1'; // fix latter
    this.attestation = {};
    this.extendedPublicData = [];
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
    this.extendedPublicData = this.extendedPublicData.concat(user.extendedPublicData);
    this.privateData.linkedAddress = this.privateData.linkedAddress.concat(user.privateData.linkedAddress);
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
