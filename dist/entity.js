"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttestedPlatformIds = exports.AttestCred = void 0;
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
//# sourceMappingURL=entity.js.map