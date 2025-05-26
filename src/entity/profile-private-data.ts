interface LinkedAddress {
  chainName: string;
  chainId: number;
  address: string;
}

interface ConnectedProfiles {
  platformType: string;
  userPlatformId: string;
  username?: string;
}

interface CredSalts {
  interests: string;
  reputationTags: string;
  badges: string;
  collections: string;
}


export class Claims {
  interests: string[];
  reputationTags: string[];
  badges: string[];
  collections: string[];
  analyzed : boolean

  constructor() {
    this.interests = [];
    this.reputationTags = [];
    this.badges = [];
    this.collections = [];
    this.analyzed = false;
  }
}


export class AttestedCred {
  interests: string[];
  reputationTags: string[];
  badges: string[];
  collections: string[];
  attestation: any;
  salt: CredSalts;

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

export class AttestedPlatformIds {
  connectedProfiles: ConnectedProfiles[];
  attestation: any;
  salt: any;
  constructor() {
    this.connectedProfiles = [];
    this.attestation = {};
    this.salt = {};
  }
}

export class ProfilePrivateData {
  attestedCred: AttestedCred;
  attestedPlatformIds: AttestedPlatformIds;
  linkedAddress: LinkedAddress[];
  extendedPrivateData: any;
  claims: Claims;

  constructor() {
    this.attestedCred = new AttestedCred();
    this.attestedPlatformIds = new AttestedPlatformIds();
    this.linkedAddress = [];
    this.extendedPrivateData = {};
    this.claims = new Claims();
  }
}
