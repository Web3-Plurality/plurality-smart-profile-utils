"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilePrivateData = exports.AttestedPlatformIds = exports.AttestCred = void 0;
class AttestCred {
    constructor() {
        this.interests = [];
        this.reputationTags = [];
        this.badges = [];
        this.collections = [];
        this.attestation = {};
        this.salt = {
            interests: '',
            reputationTags: '',
            badges: '',
            collections: '',
        };
    }
}
exports.AttestCred = AttestCred;
class AttestedPlatformIds {
    constructor() {
        this.connectedProfiles = [];
        this.attestation = {};
        this.salt = {};
    }
}
exports.AttestedPlatformIds = AttestedPlatformIds;
class ProfilePrivateData {
    constructor() {
        this.attestedCred = new AttestCred();
        this.attestedPlatformIds = new AttestedPlatformIds();
        this.linkedAddress = [];
        this.extendedPrivateData = [];
    }
}
exports.ProfilePrivateData = ProfilePrivateData;
//# sourceMappingURL=profile-private-data.js.map