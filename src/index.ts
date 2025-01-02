import { EAS, MerkleValueWithSalt, Offchain, OffchainAttestationVersion, OffchainConfig, PrivateData, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { AttestCred, AttestedPlatformIds, ProfilePrivateData } from "./entity/profile-private-data";
import { SmartProfile } from "./entity/smart-profile";
import { plainToInstance } from 'class-transformer';
import { ethers } from "ethers";




interface Config {
  privateKey: string;
  easContractAddress: string;
  rpcProvider: string;

}

class PluralityEas {
  private config: Config;
  constructor(config: Config) {
    this.config = config;
  }



  // Typecasts attestedCred or attestedPlatformIds Object to MerkleValueWithSalt to create private data attestation
  toMerkleValueWithSalt(
    attestationObj: AttestCred | AttestedPlatformIds,
    verification = false,
  ): MerkleValueWithSalt[] {
    if (attestationObj instanceof AttestCred) {
      let salt1 = '';
      let salt2 = '';
      let salt3 = '';
      let salt4 = '';
      if (
        attestationObj?.interests?.length === 0 &&
        attestationObj?.reputationTags?.length === 0 &&
        attestationObj?.badges?.length === 0 &&
        attestationObj?.collections?.length === 0
      ) {
        return [];
      }
      if (verification) {
        // verification workflow - we use existing salts from the object
        salt1 = attestationObj.salt?.interests;
        salt2 = attestationObj.salt?.reputationTags;
        salt3 = attestationObj.salt?.badges;
        salt4 = attestationObj.salt?.collections;
      } else {
        // attestation workflow - generate new salts
        salt1 = ethers.hexlify(ethers.randomBytes(32));
        salt2 = ethers.hexlify(ethers.randomBytes(32));
        salt3 = ethers.hexlify(ethers.randomBytes(32));
        salt4 = ethers.hexlify(ethers.randomBytes(32));
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
    } else if (attestationObj instanceof AttestedPlatformIds) {
      const platformIdSchema = attestationObj.connectedProfiles.map((profile: any) => {
        let salt = '';
        if (verification) {
          // verification workflow - we use existing salts from the object
          salt = attestationObj.salt[profile.platformType];
        } else {
          // attestation workflow - generate new salts
          salt = ethers.hexlify(ethers.randomBytes(32));
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
  parseAttestation(attestation: any) {
    return {
      version: attestation?.version,
      uid: attestation?.uid,
      domain: {
        name: attestation?.domain?.name,
        version: attestation?.domain?.version,
        chainId: attestation?.domain?.chainId?.toString(),
        verifyingContract: attestation?.domain?.verifyingContract,
      },
      primaryType: attestation?.primaryType,
      message: {
        version: attestation?.message?.version,
        recipient: attestation?.message?.recipient,
        expirationTime: attestation?.message?.expirationTime?.toString(),
        time: attestation?.message?.time?.toString(),
        revocable: attestation?.message?.revocable,
        schema: attestation?.message?.schema,
        refUID: attestation?.message?.refUID,
        data: attestation?.message?.data,
        salt: attestation?.message?.salt,
      },
      types: attestation?.types,
      signature: attestation?.signature,
    };
  }



  // creates offchain attestation of public data using smart profile based on Plurality's published smart profile schema
  async publicOffchainAttestation(profile: SmartProfile, recipientAddress: string, publicSchemaUid: string) {
    // Initialize the sdk with the address of the EAS Schema contract address
    const eas = new EAS(this.config.easContractAddress);
    const provider = ethers.getDefaultProvider(this.config.rpcProvider);
    const signer: any = new ethers.Wallet(this.config.privateKey, provider);
    eas.connect(signer);
    const offchain = await eas.getOffchain();
    // Initialize SchemaEncoder with the schema string
    const schemaEncoder = new SchemaEncoder(
      'string username,string bio,string avatar,string scores,string connectedPlatforms,string profileTypeStreamId,string version',
    );

    const encodedData = schemaEncoder.encodeData([
      { name: 'username', value: profile.username, type: 'string' },
      { name: 'bio', value: profile.bio, type: 'string' },
      { name: 'avatar', value: profile.avatar, type: 'string' },
      { name: 'scores', value: JSON.stringify(profile.scores), type: 'string' },
      { name: 'connectedPlatforms', value: JSON.stringify(profile.connectedPlatforms), type: 'string' },
      { name: 'profileTypeStreamId', value: profile.profileTypeStreamId, type: 'string' },
      { name: 'version', value: JSON.stringify(profile.version), type: 'string' },
    ]);

    const offchainAttestation: any = await offchain.signOffchainAttestation(
      {
        recipient: recipientAddress, // this can be empty
        expirationTime: BigInt(0), // Unix timestamp of when attestation expires (0 for no expiration)
        time: BigInt(Math.floor(Date.now() / 1000)), // Unix timestamp of current time
        revocable: false, // Be aware that if your schema is not revocable, this MUST be false
        schema: publicSchemaUid,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
        data: encodedData,
      },
      signer,
    );
    return offchainAttestation;
  }

  // creates offchain attestation of private data using merkle root based on EAS's published private data schema
  async privateOffchainAttestations(merkleObj: MerkleValueWithSalt[], recipientAddress: string, privateSchemaUid: string) {
    try {
      // Initialize the sdk with the address of the EAS Schema contract address
      const eas = new EAS(this.config.easContractAddress);
      const provider = ethers.getDefaultProvider(this.config.rpcProvider);
      const signer: any = new ethers.Wallet(this.config.privateKey, provider);
      eas.connect(signer);
      const privateData = new PrivateData(merkleObj);
      const fullTree = privateData.getFullTree();
      const schemaEncoder = new SchemaEncoder('bytes32 privateData');
      const encodedData = schemaEncoder.encodeData([{ name: 'privateData', value: fullTree.root, type: 'bytes32' }]);
      const offchain = await eas.getOffchain();
      const offchainAttestation: any = await offchain.signOffchainAttestation(
        {
          recipient: recipientAddress, // address of the recipient
          expirationTime: BigInt(0), // Unix timestamp of when attestation expires (0 for no expiration)
          time: BigInt(Math.floor(Date.now() / 1000)), // Unix timestamp of current time
          revocable: false, // Be aware that if your schema is not revocable, this MUST be false
          schema: privateSchemaUid,
          refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
          data: encodedData,
        },
        signer,
      );

      return offchainAttestation;
    } catch (error) {
      // Logger.error(`error occur while doing offchain attestation ${JSON.stringify(error)}`);
      return {};
    }
  }

  // generic function to verify attestation
  async verifyOffchainAttestation(attestation: any, recipientAddress: string) {
    try {
      // Initialize the sdk with the address of the EAS Schema contract address
      const eas = new EAS(this.config.easContractAddress);
      const EAS_CONFIG: OffchainConfig = {
        address: attestation.domain.verifyingContract,
        version: attestation.domain.version,
        chainId: BigInt(attestation.domain.chainId),
      };
      const provider = ethers.getDefaultProvider(this.config.rpcProvider);
      const signer: any = new ethers.Wallet(this.config.privateKey, provider);
      const signerAddress = await signer.getAddress();
      const offchain = new Offchain(EAS_CONFIG, OffchainAttestationVersion.Version2, eas);
      // should also check the recipient against the current pkp
      const isValidRecipient = attestation?.message?.recipient === recipientAddress;
      const isValidAttestation = offchain.verifyOffchainAttestationSignature(signerAddress, attestation);
      return isValidAttestation && isValidRecipient;
    } catch (error) {
      console.log(error)
      return false;
    }
  }

  // verify and validate attestation and data 
  async verifyCredAttestation(attestedCred: AttestCred, recipientAddress: string) {
    // check attestation exist or not
    if (attestedCred?.attestation && Object.keys(attestedCred?.attestation)?.length > 0) {
      const isValidCredAttestation = await this.verifyOffchainAttestation(attestedCred?.attestation, recipientAddress);
      if (isValidCredAttestation) {
        const credSchema = this.toMerkleValueWithSalt(attestedCred, true);
        if (credSchema?.length > 0) {
          const privateData = new PrivateData(credSchema);
          const fullTree = privateData.getFullTree();
          const schemaEncoder = new SchemaEncoder('bytes32 privateData');
          const encodedData = schemaEncoder.encodeData([{ name: 'privateData', value: fullTree.root, type: 'bytes32' }]);
          const isValid = attestedCred.attestation.message.data === encodedData;
          return isValid;
        } else {
          // Logger.error('something wrong in the merkel Cred Data.');
          return false;
        }
      } else {
        // Logger.error('Attestation is not valid');
        return false;
      }
    } else {
      // attestation not exist
      // Logger.info('attestaion does not exist.');
      return true;
    }
  }

  // verify and validate PlatformIds attestation
  async verifyPlatfomIdAttestation(attestedPlatformIds: AttestedPlatformIds, recipientAddress: string) {
    // check attestation exist or not
    if (attestedPlatformIds?.attestation && Object.keys(attestedPlatformIds?.attestation)?.length > 0) {
      const isValidPlatformIdsAttestation = await this.verifyOffchainAttestation(attestedPlatformIds?.attestation, recipientAddress);
      if (isValidPlatformIdsAttestation) {
        const platfomSchema = this.toMerkleValueWithSalt(attestedPlatformIds, true);
        if (platfomSchema?.length > 0) {
          const privateData = new PrivateData(platfomSchema);
          const fullTree = privateData.getFullTree();
          const schemaEncoder = new SchemaEncoder('bytes32 privateData');
          const encodedData = schemaEncoder.encodeData([{ name: 'privateData', value: fullTree.root, type: 'bytes32' }]);
          const isValid = attestedPlatformIds.attestation.message.data === encodedData;
          return isValid;
        } else {
          // Logger.error('something wrong in the merkel PlatformIds Data.');
          return false;
        }
      } else {
        // Logger.error('Attestation is not valid');
        return false;
      }
    } else {
      // attestation not exist
      // Logger.info('attestaion does not exist.');
      return true;
    }
  }


  //  Main Functions
  // attest profile
  async attestSmartProfile(id: string, profile: SmartProfile, recipientAddress: string, publicSchemaUid: string, privateSchemaUid: string) {
    //Public attestation
    const publicAttestation = await this.publicOffchainAttestation(profile, recipientAddress, publicSchemaUid);
    profile.attestation = this.parseAttestation(publicAttestation);
    // Logger.info(`public Data of profile attested successfully for user id: ${id}`);
    //private data attestation
    const credSchema = this.toMerkleValueWithSalt(profile.privateData.attestedCred, false);
    if (credSchema?.length > 0) {
      const credAttestation = await this.privateOffchainAttestations(credSchema, recipientAddress, privateSchemaUid);
      profile.privateData.attestedCred.attestation = this.parseAttestation(credAttestation);
      // Logger.info(`private Cred Data of profile attested successfully for user id: ${id}`);
    }
    const platformIdSchema = this.toMerkleValueWithSalt(profile.privateData.attestedPlatformIds, false);
    if (platformIdSchema?.length > 0) {
      const platformIdsAttestation = await this.privateOffchainAttestations(platformIdSchema, recipientAddress, privateSchemaUid);
      profile.privateData.attestedPlatformIds.attestation = this.parseAttestation(platformIdsAttestation);
      // Logger.info(`private platformIds Data of profile attested successfully for user id: ${id}`);
    }
    return profile;
  }


  // verify public smart profile attestation
  async verifyPublicAttestation(profile: SmartProfile, recipientAddress: string): Promise<boolean> {
    try {
      // verifying public attestation
      // check attestation exist or not
      if (profile?.attestation && Object.keys(profile?.attestation)?.length > 0) {
        const isValidAttestation = await this.verifyOffchainAttestation(profile?.attestation, recipientAddress);
        if (!isValidAttestation) {
          // Logger.error('attestaion is not valid.');
          return isValidAttestation;
        }
      } else {
        // attestation not exist
        // Logger.info('attestaion does not exist.');
        return true;
      }
      // verifying public attested data
      const schemaEncoder = new SchemaEncoder(
        'string username,string bio,string avatar,string scores,string connectedPlatforms,string profileTypeStreamId,string version',
      );
      const encodedData = schemaEncoder.encodeData([
        { name: 'username', value: profile.username, type: 'string' },
        { name: 'bio', value: profile.bio, type: 'string' },
        { name: 'avatar', value: profile.avatar, type: 'string' },
        { name: 'scores', value: JSON.stringify(profile.scores), type: 'string' },
        { name: 'connectedPlatforms', value: JSON.stringify(profile.connectedPlatforms), type: 'string' },
        { name: 'profileTypeStreamId', value: profile.profileTypeStreamId, type: 'string' },
        { name: 'version', value: JSON.stringify(profile.version), type: 'string' },
      ]);

      return profile?.attestation?.message?.data === encodedData;
    } catch (error) {
      // Logger.error(`error occur while verifying offchain attestation ${JSON.stringify(error)}`);
      return false;
    }
  }

  // verify private smart profile attestation
  async verifyPrivateAttestation(privateData: ProfilePrivateData, recipientAddress: string): Promise<boolean> {
    try {
      // verifying private attestation
      const isValidCredAttestation = await this.verifyCredAttestation(privateData?.attestedCred, recipientAddress);
      const isValidPlatformIdAttestation = await this.verifyPlatfomIdAttestation(privateData?.attestedPlatformIds, recipientAddress);
      return isValidCredAttestation && isValidPlatformIdAttestation;
    } catch (error) {
      // Logger.error(`error occur while verifying offchain attestation ${JSON.stringify(error)}`);
      return false;
    }
  }

}



function normalizeSmartProfile(data: any) {
  const smartProfile = plainToInstance(SmartProfile, JSON.parse(JSON.stringify(data)));
  smartProfile.privateData = plainToInstance(ProfilePrivateData, smartProfile.privateData);
  smartProfile.privateData.attestedCred = plainToInstance(AttestCred, smartProfile.privateData.attestedCred);
  smartProfile.privateData.attestedPlatformIds = plainToInstance(
    AttestedPlatformIds,
    smartProfile.privateData.attestedPlatformIds,
  );
  return smartProfile;
}



export  {
  PluralityEas,
  SmartProfile,
  AttestCred,
  AttestedPlatformIds,
  ProfilePrivateData,
  normalizeSmartProfile,
}