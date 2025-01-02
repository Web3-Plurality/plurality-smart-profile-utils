"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilePrivateData = exports.AttestedPlatformIds = exports.AttestCred = exports.SmartProfile = exports.PluralityEas = void 0;
exports.normalizeSmartProfile = normalizeSmartProfile;
const eas_sdk_1 = require("@ethereum-attestation-service/eas-sdk");
const profile_private_data_1 = require("./entity/profile-private-data");
Object.defineProperty(exports, "AttestCred", { enumerable: true, get: function () { return profile_private_data_1.AttestCred; } });
Object.defineProperty(exports, "AttestedPlatformIds", { enumerable: true, get: function () { return profile_private_data_1.AttestedPlatformIds; } });
Object.defineProperty(exports, "ProfilePrivateData", { enumerable: true, get: function () { return profile_private_data_1.ProfilePrivateData; } });
const smart_profile_1 = require("./entity/smart-profile");
Object.defineProperty(exports, "SmartProfile", { enumerable: true, get: function () { return smart_profile_1.SmartProfile; } });
const class_transformer_1 = require("class-transformer");
const ethers_1 = require("ethers");
class PluralityEas {
    constructor(config) {
        this.config = config;
    }
    // Typecasts attestedCred or attestedPlatformIds Object to MerkleValueWithSalt to create private data attestation
    toMerkleValueWithSalt(attestationObj, verification = false) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (attestationObj instanceof profile_private_data_1.AttestCred) {
            let salt1 = '';
            let salt2 = '';
            let salt3 = '';
            let salt4 = '';
            if (((_a = attestationObj === null || attestationObj === void 0 ? void 0 : attestationObj.interests) === null || _a === void 0 ? void 0 : _a.length) === 0 &&
                ((_b = attestationObj === null || attestationObj === void 0 ? void 0 : attestationObj.reputationTags) === null || _b === void 0 ? void 0 : _b.length) === 0 &&
                ((_c = attestationObj === null || attestationObj === void 0 ? void 0 : attestationObj.badges) === null || _c === void 0 ? void 0 : _c.length) === 0 &&
                ((_d = attestationObj === null || attestationObj === void 0 ? void 0 : attestationObj.collections) === null || _d === void 0 ? void 0 : _d.length) === 0) {
                return [];
            }
            if (verification) {
                // verification workflow - we use existing salts from the object
                salt1 = (_e = attestationObj.salt) === null || _e === void 0 ? void 0 : _e.interests;
                salt2 = (_f = attestationObj.salt) === null || _f === void 0 ? void 0 : _f.reputationTags;
                salt3 = (_g = attestationObj.salt) === null || _g === void 0 ? void 0 : _g.badges;
                salt4 = (_h = attestationObj.salt) === null || _h === void 0 ? void 0 : _h.collections;
            }
            else {
                // attestation workflow - generate new salts
                salt1 = ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32));
                salt2 = ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32));
                salt3 = ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32));
                salt4 = ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32));
                // saving salts
                attestationObj.salt.interests = salt1;
                attestationObj.salt.reputationTags = salt2;
                attestationObj.salt.badges = salt3;
                attestationObj.salt.collections = salt4;
            }
            return [
                {
                    name: 'interests',
                    value: JSON.stringify(attestationObj.interests),
                    type: 'string',
                    salt: salt1,
                },
                {
                    name: 'reputationTags',
                    value: JSON.stringify(attestationObj.reputationTags),
                    type: 'string',
                    salt: salt2,
                },
                {
                    name: 'badges',
                    value: JSON.stringify(attestationObj.badges),
                    type: 'string',
                    salt: salt3,
                },
                {
                    name: 'collections',
                    value: JSON.stringify(attestationObj.collections),
                    type: 'string',
                    salt: salt4,
                },
            ];
        }
        else if (attestationObj instanceof profile_private_data_1.AttestedPlatformIds) {
            const platformIdSchema = attestationObj.connectedProfiles.map((profile) => {
                let salt = '';
                if (verification) {
                    // verification workflow - we use existing salts from the object
                    salt = attestationObj.salt[profile.platformType];
                }
                else {
                    // attestation workflow - generate new salts
                    salt = ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32));
                    // saving salts
                    attestationObj.salt[profile.platformType] = salt;
                }
                return {
                    name: profile.platformType,
                    value: JSON.stringify(profile),
                    type: 'string',
                    salt,
                };
            });
            return platformIdSchema;
        }
        throw new Error('Invalid attestationObj type');
    }
    // parse individual attestation values to string due to large bigint non serializable by json
    parseAttestation(attestation) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        return {
            version: attestation === null || attestation === void 0 ? void 0 : attestation.version,
            uid: attestation === null || attestation === void 0 ? void 0 : attestation.uid,
            domain: {
                name: (_a = attestation === null || attestation === void 0 ? void 0 : attestation.domain) === null || _a === void 0 ? void 0 : _a.name,
                version: (_b = attestation === null || attestation === void 0 ? void 0 : attestation.domain) === null || _b === void 0 ? void 0 : _b.version,
                chainId: (_d = (_c = attestation === null || attestation === void 0 ? void 0 : attestation.domain) === null || _c === void 0 ? void 0 : _c.chainId) === null || _d === void 0 ? void 0 : _d.toString(),
                verifyingContract: (_e = attestation === null || attestation === void 0 ? void 0 : attestation.domain) === null || _e === void 0 ? void 0 : _e.verifyingContract,
            },
            primaryType: attestation === null || attestation === void 0 ? void 0 : attestation.primaryType,
            message: {
                version: (_f = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _f === void 0 ? void 0 : _f.version,
                recipient: (_g = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _g === void 0 ? void 0 : _g.recipient,
                expirationTime: (_j = (_h = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _h === void 0 ? void 0 : _h.expirationTime) === null || _j === void 0 ? void 0 : _j.toString(),
                time: (_l = (_k = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _k === void 0 ? void 0 : _k.time) === null || _l === void 0 ? void 0 : _l.toString(),
                revocable: (_m = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _m === void 0 ? void 0 : _m.revocable,
                schema: (_o = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _o === void 0 ? void 0 : _o.schema,
                refUID: (_p = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _p === void 0 ? void 0 : _p.refUID,
                data: (_q = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _q === void 0 ? void 0 : _q.data,
                salt: (_r = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _r === void 0 ? void 0 : _r.salt,
            },
            types: attestation === null || attestation === void 0 ? void 0 : attestation.types,
            signature: attestation === null || attestation === void 0 ? void 0 : attestation.signature,
        };
    }
    // creates offchain attestation of public data using smart profile based on Plurality's published smart profile schema
    publicOffchainAttestation(profile, recipientAddress, publicSchemaUid) {
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize the sdk with the address of the EAS Schema contract address
            const eas = new eas_sdk_1.EAS(this.config.easContractAddress);
            const provider = ethers_1.ethers.getDefaultProvider(this.config.rpcProvider);
            const signer = new ethers_1.ethers.Wallet(this.config.privateKey, provider);
            eas.connect(signer);
            const offchain = yield eas.getOffchain();
            // Initialize SchemaEncoder with the schema string
            const schemaEncoder = new eas_sdk_1.SchemaEncoder('string username,string bio,string avatar,string scores,string connectedPlatforms,string profileTypeStreamId,string version');
            const encodedData = schemaEncoder.encodeData([
                { name: 'username', value: profile.username, type: 'string' },
                { name: 'bio', value: profile.bio, type: 'string' },
                { name: 'avatar', value: profile.avatar, type: 'string' },
                { name: 'scores', value: JSON.stringify(profile.scores), type: 'string' },
                { name: 'connectedPlatforms', value: JSON.stringify(profile.connectedPlatforms), type: 'string' },
                { name: 'profileTypeStreamId', value: profile.profileTypeStreamId, type: 'string' },
                { name: 'version', value: JSON.stringify(profile.version), type: 'string' },
            ]);
            const offchainAttestation = yield offchain.signOffchainAttestation({
                recipient: recipientAddress, // this can be empty
                expirationTime: BigInt(0), // Unix timestamp of when attestation expires (0 for no expiration)
                time: BigInt(Math.floor(Date.now() / 1000)), // Unix timestamp of current time
                revocable: false, // Be aware that if your schema is not revocable, this MUST be false
                schema: publicSchemaUid,
                refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
                data: encodedData,
            }, signer);
            return offchainAttestation;
        });
    }
    // creates offchain attestation of private data using merkle root based on EAS's published private data schema
    privateOffchainAttestations(merkleObj, recipientAddress, privateSchemaUid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Initialize the sdk with the address of the EAS Schema contract address
                const eas = new eas_sdk_1.EAS(this.config.easContractAddress);
                const provider = ethers_1.ethers.getDefaultProvider(this.config.rpcProvider);
                const signer = new ethers_1.ethers.Wallet(this.config.privateKey, provider);
                eas.connect(signer);
                const privateData = new eas_sdk_1.PrivateData(merkleObj);
                const fullTree = privateData.getFullTree();
                const schemaEncoder = new eas_sdk_1.SchemaEncoder('bytes32 privateData');
                const encodedData = schemaEncoder.encodeData([{ name: 'privateData', value: fullTree.root, type: 'bytes32' }]);
                const offchain = yield eas.getOffchain();
                const offchainAttestation = yield offchain.signOffchainAttestation({
                    recipient: recipientAddress, // address of the recipient
                    expirationTime: BigInt(0), // Unix timestamp of when attestation expires (0 for no expiration)
                    time: BigInt(Math.floor(Date.now() / 1000)), // Unix timestamp of current time
                    revocable: false, // Be aware that if your schema is not revocable, this MUST be false
                    schema: privateSchemaUid,
                    refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    data: encodedData,
                }, signer);
                return offchainAttestation;
            }
            catch (error) {
                // Logger.error(`error occur while doing offchain attestation ${JSON.stringify(error)}`);
                return {};
            }
        });
    }
    // generic function to verify attestation
    verifyOffchainAttestation(attestation, recipientAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Initialize the sdk with the address of the EAS Schema contract address
                const eas = new eas_sdk_1.EAS(this.config.easContractAddress);
                const EAS_CONFIG = {
                    address: attestation.domain.verifyingContract,
                    version: attestation.domain.version,
                    chainId: BigInt(attestation.domain.chainId),
                };
                const provider = ethers_1.ethers.getDefaultProvider(this.config.rpcProvider);
                const signer = new ethers_1.ethers.Wallet(this.config.privateKey, provider);
                const signerAddress = yield signer.getAddress();
                const offchain = new eas_sdk_1.Offchain(EAS_CONFIG, eas_sdk_1.OffchainAttestationVersion.Version2, eas);
                // should also check the recipient against the current pkp
                const isValidRecipient = ((_a = attestation === null || attestation === void 0 ? void 0 : attestation.message) === null || _a === void 0 ? void 0 : _a.recipient) === recipientAddress;
                const isValidAttestation = offchain.verifyOffchainAttestationSignature(signerAddress, attestation);
                return isValidAttestation && isValidRecipient;
            }
            catch (error) {
                console.log(error);
                return false;
            }
        });
    }
    // verify and validate attestation and data 
    verifyCredAttestation(attestedCred, recipientAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // check attestation exist or not
            if ((attestedCred === null || attestedCred === void 0 ? void 0 : attestedCred.attestation) && ((_a = Object.keys(attestedCred === null || attestedCred === void 0 ? void 0 : attestedCred.attestation)) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                const isValidCredAttestation = yield this.verifyOffchainAttestation(attestedCred === null || attestedCred === void 0 ? void 0 : attestedCred.attestation, recipientAddress);
                if (isValidCredAttestation) {
                    const credSchema = this.toMerkleValueWithSalt(attestedCred, true);
                    if ((credSchema === null || credSchema === void 0 ? void 0 : credSchema.length) > 0) {
                        const privateData = new eas_sdk_1.PrivateData(credSchema);
                        const fullTree = privateData.getFullTree();
                        const schemaEncoder = new eas_sdk_1.SchemaEncoder('bytes32 privateData');
                        const encodedData = schemaEncoder.encodeData([{ name: 'privateData', value: fullTree.root, type: 'bytes32' }]);
                        const isValid = attestedCred.attestation.message.data === encodedData;
                        return isValid;
                    }
                    else {
                        // Logger.error('something wrong in the merkel Cred Data.');
                        return false;
                    }
                }
                else {
                    // Logger.error('Attestation is not valid');
                    return false;
                }
            }
            else {
                // attestation not exist
                // Logger.info('attestaion does not exist.');
                return true;
            }
        });
    }
    // verify and validate PlatformIds attestation
    verifyPlatfomIdAttestation(attestedPlatformIds, recipientAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // check attestation exist or not
            if ((attestedPlatformIds === null || attestedPlatformIds === void 0 ? void 0 : attestedPlatformIds.attestation) && ((_a = Object.keys(attestedPlatformIds === null || attestedPlatformIds === void 0 ? void 0 : attestedPlatformIds.attestation)) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                const isValidPlatformIdsAttestation = yield this.verifyOffchainAttestation(attestedPlatformIds === null || attestedPlatformIds === void 0 ? void 0 : attestedPlatformIds.attestation, recipientAddress);
                if (isValidPlatformIdsAttestation) {
                    const platfomSchema = this.toMerkleValueWithSalt(attestedPlatformIds, true);
                    if ((platfomSchema === null || platfomSchema === void 0 ? void 0 : platfomSchema.length) > 0) {
                        const privateData = new eas_sdk_1.PrivateData(platfomSchema);
                        const fullTree = privateData.getFullTree();
                        const schemaEncoder = new eas_sdk_1.SchemaEncoder('bytes32 privateData');
                        const encodedData = schemaEncoder.encodeData([{ name: 'privateData', value: fullTree.root, type: 'bytes32' }]);
                        const isValid = attestedPlatformIds.attestation.message.data === encodedData;
                        return isValid;
                    }
                    else {
                        // Logger.error('something wrong in the merkel PlatformIds Data.');
                        return false;
                    }
                }
                else {
                    // Logger.error('Attestation is not valid');
                    return false;
                }
            }
            else {
                // attestation not exist
                // Logger.info('attestaion does not exist.');
                return true;
            }
        });
    }
    //  Main Functions
    // attest profile
    attestSmartProfile(id, profile, recipientAddress, publicSchemaUid, privateSchemaUid) {
        return __awaiter(this, void 0, void 0, function* () {
            //Public attestation
            const publicAttestation = yield this.publicOffchainAttestation(profile, recipientAddress, publicSchemaUid);
            profile.attestation = this.parseAttestation(publicAttestation);
            // Logger.info(`public Data of profile attested successfully for user id: ${id}`);
            //private data attestation
            const credSchema = this.toMerkleValueWithSalt(profile.privateData.attestedCred, false);
            if ((credSchema === null || credSchema === void 0 ? void 0 : credSchema.length) > 0) {
                const credAttestation = yield this.privateOffchainAttestations(credSchema, recipientAddress, privateSchemaUid);
                profile.privateData.attestedCred.attestation = this.parseAttestation(credAttestation);
                // Logger.info(`private Cred Data of profile attested successfully for user id: ${id}`);
            }
            const platformIdSchema = this.toMerkleValueWithSalt(profile.privateData.attestedPlatformIds, false);
            if ((platformIdSchema === null || platformIdSchema === void 0 ? void 0 : platformIdSchema.length) > 0) {
                const platformIdsAttestation = yield this.privateOffchainAttestations(platformIdSchema, recipientAddress, privateSchemaUid);
                profile.privateData.attestedPlatformIds.attestation = this.parseAttestation(platformIdsAttestation);
                // Logger.info(`private platformIds Data of profile attested successfully for user id: ${id}`);
            }
            return profile;
        });
    }
    // verify public smart profile attestation
    verifyPublicAttestation(profile, recipientAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                // verifying public attestation
                // check attestation exist or not
                if ((profile === null || profile === void 0 ? void 0 : profile.attestation) && ((_a = Object.keys(profile === null || profile === void 0 ? void 0 : profile.attestation)) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                    const isValidAttestation = yield this.verifyOffchainAttestation(profile === null || profile === void 0 ? void 0 : profile.attestation, recipientAddress);
                    if (!isValidAttestation) {
                        // Logger.error('attestaion is not valid.');
                        return isValidAttestation;
                    }
                }
                else {
                    // attestation not exist
                    // Logger.info('attestaion does not exist.');
                    return true;
                }
                // verifying public attested data
                const schemaEncoder = new eas_sdk_1.SchemaEncoder('string username,string bio,string avatar,string scores,string connectedPlatforms,string profileTypeStreamId,string version');
                const encodedData = schemaEncoder.encodeData([
                    { name: 'username', value: profile.username, type: 'string' },
                    { name: 'bio', value: profile.bio, type: 'string' },
                    { name: 'avatar', value: profile.avatar, type: 'string' },
                    { name: 'scores', value: JSON.stringify(profile.scores), type: 'string' },
                    { name: 'connectedPlatforms', value: JSON.stringify(profile.connectedPlatforms), type: 'string' },
                    { name: 'profileTypeStreamId', value: profile.profileTypeStreamId, type: 'string' },
                    { name: 'version', value: JSON.stringify(profile.version), type: 'string' },
                ]);
                return ((_c = (_b = profile === null || profile === void 0 ? void 0 : profile.attestation) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.data) === encodedData;
            }
            catch (error) {
                // Logger.error(`error occur while verifying offchain attestation ${JSON.stringify(error)}`);
                return false;
            }
        });
    }
    // verify private smart profile attestation
    verifyPrivateAttestation(privateData, recipientAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // verifying private attestation
                const isValidCredAttestation = yield this.verifyCredAttestation(privateData === null || privateData === void 0 ? void 0 : privateData.attestedCred, recipientAddress);
                const isValidPlatformIdAttestation = yield this.verifyPlatfomIdAttestation(privateData === null || privateData === void 0 ? void 0 : privateData.attestedPlatformIds, recipientAddress);
                return isValidCredAttestation && isValidPlatformIdAttestation;
            }
            catch (error) {
                // Logger.error(`error occur while verifying offchain attestation ${JSON.stringify(error)}`);
                return false;
            }
        });
    }
}
exports.PluralityEas = PluralityEas;
function normalizeSmartProfile(data) {
    const smartProfile = (0, class_transformer_1.plainToInstance)(smart_profile_1.SmartProfile, JSON.parse(JSON.stringify(data)));
    smartProfile.privateData = (0, class_transformer_1.plainToInstance)(profile_private_data_1.ProfilePrivateData, smartProfile.privateData);
    smartProfile.privateData.attestedCred = (0, class_transformer_1.plainToInstance)(profile_private_data_1.AttestCred, smartProfile.privateData.attestedCred);
    smartProfile.privateData.attestedPlatformIds = (0, class_transformer_1.plainToInstance)(profile_private_data_1.AttestedPlatformIds, smartProfile.privateData.attestedPlatformIds);
    return smartProfile;
}
//# sourceMappingURL=index.js.map