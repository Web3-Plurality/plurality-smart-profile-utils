"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartProfile = exports.ScoreTypes = void 0;
const profile_private_data_1 = require("./profile-private-data");
// scores Field -> this should go to database if we convert to microservice
var ScoreTypes;
(function (ScoreTypes) {
    ScoreTypes["reputationScore"] = "reputation_score";
    ScoreTypes["socialScore"] = "social_score";
})(ScoreTypes || (exports.ScoreTypes = ScoreTypes = {}));
class SmartProfile {
    constructor(data) {
        this.username = (data === null || data === void 0 ? void 0 : data.username) || '';
        this.avatar = (data === null || data === void 0 ? void 0 : data.avatar) || '';
        this.bio = (data === null || data === void 0 ? void 0 : data.bio) || '';
        this.scores = Object.values(ScoreTypes).map((scoreType) => ({
            scoreType: scoreType,
            scoreValue: 0,
        }));
        this.connectedPlatforms = (data === null || data === void 0 ? void 0 : data.connected_platforms) || [];
        this.profileTypeStreamId = '';
        this.version = '1'; // fix latter
        this.attestation = {};
        this.extendedPublicData = [];
        this.privateData = new profile_private_data_1.ProfilePrivateData();
    }
    // You can add methods to manipulate or retrieve the data here
    aggregateProfile(user) {
        this.privateData.attestedCred.collections = this.privateData.attestedCred.collections.concat(user.privateData.attestedCred.collections);
        this.privateData.attestedCred.interests = this.privateData.attestedCred.interests.concat(user.privateData.attestedCred.interests);
        this.privateData.attestedCred.reputationTags = this.privateData.attestedCred.reputationTags.concat(user.privateData.attestedCred.reputationTags);
        this.privateData.attestedCred.badges = this.privateData.attestedCred.badges.concat(user.privateData.attestedCred.badges);
        this.extendedPublicData = this.extendedPublicData.concat(user.extendedPublicData);
        this.privateData.linkedAddress = this.privateData.linkedAddress.concat(user.privateData.linkedAddress);
        const newProfile = user.privateData.attestedPlatformIds.connectedProfiles.filter((profile) => !this.privateData.attestedPlatformIds.connectedProfiles.includes(profile));
        this.privateData.attestedPlatformIds.connectedProfiles =
            this.privateData.attestedPlatformIds.connectedProfiles.concat(newProfile);
        const updatedScores = this.scores.map((score) => {
            const userScore = user.scores.find((us) => us.scoreType === score.scoreType);
            if (userScore) {
                return Object.assign(Object.assign({}, score), { scoreValue: score.scoreValue + userScore.scoreValue });
            }
            return score;
        });
        // update the score
        this.scores = updatedScores;
    }
    updateScoreValue(scoreType, newValue) {
        this.scores = this.scores.map((score) => {
            if (score.scoreType === scoreType) {
                return Object.assign(Object.assign({}, score), { scoreValue: newValue });
            }
            return score;
        });
    }
}
exports.SmartProfile = SmartProfile;
//# sourceMappingURL=smart-profile.js.map