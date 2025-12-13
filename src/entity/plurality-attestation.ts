import { EAS, MerkleValueWithSalt, Offchain, OffchainAttestationVersion, OffchainConfig, PrivateData, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { AttestedCred, AttestedPlatformIds, ProfilePrivateData } from "./profile-private-data";
import { ethers } from "ethers";
import { SmartProfile } from "./smart-profile";

interface Config {
  signerPrivateKey?: string;
  signerAddress: string;
  easContractAddress: string;
  rpcProvider: string;
}

export class PluralityAttestation {
  private config: Config;
  constructor(config: Config) {
    this.config = config;
  }



  // Typecasts attestedCred or attestedPlatformIds Object to MerkleValueWithSalt to create private data attestation
  private toMerkleValueWithSalt(
    attestationObj: AttestedCred | AttestedPlatformIds,
    verification = false,
  ): MerkleValueWithSalt[] {
    if (attestationObj instanceof AttestedCred) {
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
  private parseAttestation(attestation: any) {
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
  private async publicOffchainAttestation(profile: SmartProfile, recipientAddress: string, publicSchemaUid: string) {
    // Initialize the sdk with the address of the EAS Schema contract address
    const eas = new EAS(this.config.easContractAddress);
    const provider = ethers.getDefaultProvider(this.config.rpcProvider);
    const signer: any = new ethers.Wallet(this.config.signerPrivateKey || '', provider);
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
  private async privateOffchainAttestations(merkleObj: MerkleValueWithSalt[], recipientAddress: string, privateSchemaUid: string) {
    try {
      // Initialize the sdk with the address of the EAS Schema contract address
      const eas = new EAS(this.config.easContractAddress);
      const provider = ethers.getDefaultProvider(this.config.rpcProvider);
      const signer: any = new ethers.Wallet(this.config.signerPrivateKey || '', provider);
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
  private async verifyOffchainAttestation(attestation: any, recipientAddress: string) {
    try {
      // Initialize the sdk with the address of the EAS Schema contract address
      const eas = new EAS(this.config.easContractAddress);
      const EAS_CONFIG: OffchainConfig = {
        address: attestation.domain.verifyingContract,
        version: attestation.domain.version,
        chainId: BigInt(attestation.domain.chainId),
      };
      const offchain = new Offchain(EAS_CONFIG, OffchainAttestationVersion.Version2, eas);
      // should also check the recipient against the current pkp
      const isValidRecipient = attestation?.message?.recipient === recipientAddress;
      const isValidAttestation = offchain.verifyOffchainAttestationSignature(this.config.signerAddress, attestation);
      return isValidAttestation && isValidRecipient;
    } catch (error) {
      console.log(error)
      return false;
    }
  }

  // verify and validate attestation and data 
  private async verifyCredAttestation(attestedCred: AttestedCred, recipientAddress: string) {
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
  private async verifyPlatfomIdAttestation(attestedPlatformIds: AttestedPlatformIds, recipientAddress: string) {
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

  //  Public Functions Below

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

      return String(profile?.attestation?.message?.data) === String(encodedData);
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


  // verify smart profile attestation
  async verifySmartProfileAttestation(smartProfile: SmartProfile, recipientAddress: string): Promise<boolean> {
    try {
      // verifying private attestation
      const isValidPublicAttestation = await this.verifyPublicAttestation(smartProfile, recipientAddress);
      const isValidPrivateAttestation = await this.verifyPrivateAttestation(smartProfile?.privateData, recipientAddress);
      return isValidPublicAttestation && isValidPrivateAttestation;
    } catch (error) {
      // Logger.error(`error occur while verifying offchain attestation ${JSON.stringify(error)}`);
      return false;
    }
  }

  // ===== ON-CHAIN ATTESTATION METHODS (Sapphire Chain) =====

  /**
   * Create on-chain attestations for a Smart Profile on Sapphire chain
   * Creates TWO attestations:
   * 1. Public Profile attestation (Schema A)
   * 2. Private Profile attestation with Merkle root (Schema B)
   *
   * @param smartProfile - The smart profile to attest
   * @param recipientAddress - User's PKP address
   * @param publicSchemaUid - Public schema UID (e.g., 0xbc2f3f4d...)
   * @param privateSchemaUid - Private schema UID (e.g., 0x732900b9...)
   * @returns Attestation UIDs and transaction hashes
   */
  async attestSmartProfileOnChain(
    smartProfile: SmartProfile,
    recipientAddress: string,
    publicSchemaUid: string,
    privateSchemaUid: string
  ): Promise<{
    publicAttestationUID: string;
    privateAttestationUID: string;
    transactionHashes: string[];
    chainId: number;
    totalGasCost: bigint;
  }> {
    // Initialize EAS SDK for on-chain operations
    const eas = new EAS(this.config.easContractAddress);
    const provider = new ethers.JsonRpcProvider(this.config.rpcProvider);
    const signer = new ethers.Wallet(this.config.signerPrivateKey || '', provider);

    // Get current gas price from network and use a reasonable value for Sapphire
    const feeData = await provider.getFeeData();
    console.log('Current network gas price:', feeData.gasPrice?.toString());

    eas.connect(signer);

    // Step 1: Attest public profile data (Schema A)
    const publicData = this.encodePublicProfileData(smartProfile);

    const publicTxResponse: any = await eas.attest({
      schema: publicSchemaUid,
      data: {
        recipient: recipientAddress,
        expirationTime: BigInt(0),
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
        data: publicData,
        value: BigInt(0),
      },
    });

    // Use the transaction's wait callback to get attestation UID
    const publicAttestationUID: string = await publicTxResponse.wait();
    console.log(`Public attestation created: ${publicAttestationUID}`);

    // Get gas usage from public attestation transaction
    // The EAS SDK returns { data, receipt, signer, waitCallback }
    let publicGasUsed = BigInt(0);
    let publicGasPrice = feeData.gasPrice || BigInt(100000000000);
    let publicTxHash = '';

    // The receipt is directly on the response
    const publicReceipt = publicTxResponse.receipt;
    if (publicReceipt) {
      console.log('publicReceipt.gasUsed:', publicReceipt.gasUsed);
      if (publicReceipt.gasUsed) {
        publicGasUsed = publicReceipt.gasUsed;
      }
      if (publicReceipt.gasPrice) {
        publicGasPrice = publicReceipt.gasPrice;
      }
      publicTxHash = publicReceipt.hash || '';
    }

    // Step 2: Attest private data Merkle root (Schema B)
    const merkleRoot = this.generateMerkleRootFromPrivateData(smartProfile.privateData);
    const privateData = this.encodePrivateProfileData(merkleRoot, '');

    const privateTxResponse: any = await eas.attest({
      schema: privateSchemaUid,
      data: {
        recipient: recipientAddress,
        expirationTime: BigInt(0),
        revocable: true,
        refUID: publicAttestationUID, // Link to public attestation
        data: privateData,
        value: BigInt(0),
      },
    });

    // Use the transaction's wait callback to get attestation UID
    const privateAttestationUID: string = await privateTxResponse.wait();
    console.log(`Private attestation created: ${privateAttestationUID}`);

    // Get gas usage from private attestation transaction
    let privateGasUsed = BigInt(0);
    let privateGasPrice = feeData.gasPrice || BigInt(100000000000);
    let privateTxHash = '';

    const privateReceipt = privateTxResponse.receipt;
    if (privateReceipt) {
      console.log('privateReceipt.gasUsed:', privateReceipt.gasUsed);
      if (privateReceipt.gasUsed) {
        privateGasUsed = privateReceipt.gasUsed;
      }
      if (privateReceipt.gasPrice) {
        privateGasPrice = privateReceipt.gasPrice;
      }
      privateTxHash = privateReceipt.hash || '';
    }

    // Calculate total gas usage and cost
    const totalGasUsed = publicGasUsed + privateGasUsed;
    const avgGasPrice = publicGasPrice > BigInt(0) ? publicGasPrice : privateGasPrice;
    const totalGasCost = totalGasUsed * avgGasPrice;

    console.log(`Gas usage - Public: ${publicGasUsed}, Private: ${privateGasUsed}, Total: ${totalGasUsed}`);
    console.log(`Total gas cost: ${totalGasCost} wei`);

    return {
      publicAttestationUID: publicAttestationUID,
      privateAttestationUID: privateAttestationUID,
      transactionHashes: [publicTxHash, privateTxHash],
      chainId: Number((await provider.getNetwork()).chainId),
      totalGasCost,
    };
  }

  /**
   * Encode public profile data according to Schema A
   * Schema: string username,string bio,string avatar,string scores,string connectedPlatforms,string profileTypeStreamId,string version,string extendedPublicData
   */
  private encodePublicProfileData(profile: SmartProfile): string {
    const schemaEncoder = new SchemaEncoder(
      'string username,string bio,string avatar,string scores,string connectedPlatforms,string profileTypeStreamId,string version,string extendedPublicData'
    );

    return schemaEncoder.encodeData([
      { name: 'username', value: profile.username, type: 'string' },
      { name: 'bio', value: profile.bio, type: 'string' },
      { name: 'avatar', value: profile.avatar, type: 'string' },
      { name: 'scores', value: JSON.stringify(profile.scores), type: 'string' },
      { name: 'connectedPlatforms', value: JSON.stringify(profile.connectedPlatforms), type: 'string' },
      { name: 'profileTypeStreamId', value: profile.profileTypeStreamId, type: 'string' },
      { name: 'version', value: profile.version, type: 'string' },
      { name: 'extendedPublicData', value: JSON.stringify(profile.extendedPublicData || {}), type: 'string' },
    ]);
  }

  /**
   * Encode private profile data according to Schema B
   * Schema: bytes32 privateDataRoot,string databasePointer
   */
  private encodePrivateProfileData(merkleRoot: string, databasePointer: string): string {
    const schemaEncoder = new SchemaEncoder('bytes32 privateDataRoot,string databasePointer');

    return schemaEncoder.encodeData([
      { name: 'privateDataRoot', value: merkleRoot, type: 'bytes32' },
      { name: 'databasePointer', value: databasePointer, type: 'string' },
    ]);
  }

  /**
   * Generate Merkle root from private data
   * Combines attestedCred and attestedPlatformIds into a single Merkle tree
   */
  private generateMerkleRootFromPrivateData(privateData: ProfilePrivateData): string {
    const merkleValues: MerkleValueWithSalt[] = [];

    // Add credentials to Merkle tree
    const credSchema = this.toMerkleValueWithSalt(privateData.attestedCred, false);
    if (credSchema?.length > 0) {
      merkleValues.push(...credSchema);
    }

    // Add platform IDs to Merkle tree
    const platformIdSchema = this.toMerkleValueWithSalt(privateData.attestedPlatformIds, false);
    if (platformIdSchema?.length > 0) {
      merkleValues.push(...platformIdSchema);
    }

    if (merkleValues.length === 0) {
      // No private data, return zero hash
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }

    // Generate Merkle tree
    const privateDataObj = new PrivateData(merkleValues);
    const fullTree = privateDataObj.getFullTree();
    return fullTree.root;
  }

  /**
   * Retrieve and decode an on-chain attestation
   * @param attestationUID - The UID of the on-chain attestation
   * @returns Decoded attestation data
   */
  async getOnChainAttestation(attestationUID: string): Promise<{
    attestation: any;
    decodedData: any;
  }> {
    const eas = new EAS(this.config.easContractAddress);
    const provider = new ethers.JsonRpcProvider(this.config.rpcProvider);
    eas.connect(provider);

    const attestation = await eas.getAttestation(attestationUID);

    // Decode based on schema (public schema)
    const schemaEncoder = new SchemaEncoder(
      'string username,string bio,string avatar,string scores,string connectedPlatforms,string profileTypeStreamId,string version,string extendedPublicData'
    );

    const decodedData = schemaEncoder.decodeData(attestation.data);

    return { attestation, decodedData };
  }

  /**
   * Verify on-chain attestation and reconstruct SmartProfile
   * @param publicAttestationUID - Public attestation UID
   * @param privateAttestationUID - Private attestation UID
   * @param expectedRecipient - Expected PKP address
   * @returns Verification result and reconstructed profile
   */
  async verifyAndReconstructProfile(
    publicAttestationUID: string,
    privateAttestationUID: string,
    expectedRecipient: string
  ): Promise<{ isValid: boolean; profile?: SmartProfile }> {
    try {
      const { attestation: publicAttestation, decodedData } =
        await this.getOnChainAttestation(publicAttestationUID);

      // Verify recipient
      if (publicAttestation.recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
        console.error('Recipient mismatch');
        return { isValid: false };
      }

      // Verify not revoked
      if (publicAttestation.revocationTime !== BigInt(0)) {
        console.error('Attestation has been revoked');
        return { isValid: false };
      }

      // Reconstruct SmartProfile from decoded data
      const profile = new SmartProfile();
      profile.username = decodedData.find((d: any) => d.name === 'username').value.value;
      profile.bio = decodedData.find((d: any) => d.name === 'bio').value.value;
      profile.avatar = decodedData.find((d: any) => d.name === 'avatar').value.value;
      profile.scores = JSON.parse(decodedData.find((d: any) => d.name === 'scores').value.value);
      profile.connectedPlatforms = JSON.parse(decodedData.find((d: any) => d.name === 'connectedPlatforms').value.value);
      profile.profileTypeStreamId = decodedData.find((d: any) => d.name === 'profileTypeStreamId').value.value;
      profile.version = decodedData.find((d: any) => d.name === 'version').value.value;
      profile.extendedPublicData = JSON.parse(decodedData.find((d: any) => d.name === 'extendedPublicData').value.value || '{}');

      // Add attestation metadata
      profile.onchainAttestationUID = publicAttestationUID;
      profile.privateAttestationUID = privateAttestationUID;

      return { isValid: true, profile };
    } catch (error) {
      console.error('Attestation verification failed:', error);
      return { isValid: false };
    }
  }



}