import { Logger } from "winston";
import { ClientID, GameID } from "../core/Schemas";
import { generateID } from "../core/Util";

export interface PartyMember {
  id: string;
  clientId: ClientID;
  name: string;
  flag: string;
  isHost: boolean;
  isConnected: boolean;
  inGame: boolean;
}

export interface Party {
  id: string;
  hostId: string;
  members: Map<string, PartyMember>;
  createdAt: number;
  gameId?: GameID;
  inGame: boolean;
  workerIndex?: number;
  hostActivity?: string;
  hostSelectedLobby?: { gameID: string; mapName?: string };
  memberGames: Map<string, { gameId: GameID; joinedAt: number }>; // Track which game each member is in
}

export class PartyManager {
  private parties: Map<string, Party> = new Map();
  private memberToParty: Map<string, string> = new Map();
  private partyCodeToId: Map<string, string> = new Map();
  
  constructor(private log: Logger) {
    // Clean up stale parties every 5 minutes
    setInterval(() => this.cleanupStaleParties(), 5 * 60 * 1000);
  }

  createParty(hostId: string, hostClientId: ClientID, hostName: string, hostFlag: string): string {
    const partyCode = this.generatePartyCode();
    const partyId = generateID();
    
    const party: Party = {
      id: partyId,
      hostId: hostId,
      members: new Map(),
      createdAt: Date.now(),
      inGame: false,
      memberGames: new Map()
    };
    
    const hostMember: PartyMember = {
      id: hostId,
      clientId: hostClientId,
      name: hostName,
      flag: hostFlag,
      isHost: true,
      isConnected: true,
      inGame: false
    };
    
    party.members.set(hostId, hostMember);
    this.parties.set(partyId, party);
    this.partyCodeToId.set(partyCode, partyId);
    this.memberToParty.set(hostId, partyId);
    
    this.log.info(`Party created: ${partyCode} by ${hostName}`);
    
    return partyCode;
  }

  joinParty(partyCode: string, memberId: string, memberClientId: ClientID, memberName: string, memberFlag: string): Party | null {
    const partyId = this.partyCodeToId.get(partyCode);
    if (!partyId) {
      this.log.warn(`Party not found: ${partyCode}`);
      return null;
    }
    
    const party = this.parties.get(partyId);
    if (!party) {
      this.log.warn(`Party data not found: ${partyId}`);
      return null;
    }
    
    if (party.members.size >= 10) {
      this.log.warn(`Party full: ${partyCode}`);
      return null;
    }
    
    if (party.inGame) {
      this.log.warn(`Party already in game: ${partyCode}`);
      return null;
    }
    
    const member: PartyMember = {
      id: memberId,
      clientId: memberClientId,
      name: memberName,
      flag: memberFlag,
      isHost: false,
      isConnected: true,
      inGame: false
    };
    
    party.members.set(memberId, member);
    this.memberToParty.set(memberId, partyId);
    
    this.log.info(`${memberName} joined party ${partyCode}`);
    
    return party;
  }

  leaveParty(memberId: string): Party | null {
    const partyId = this.memberToParty.get(memberId);
    if (!partyId) {
      return null;
    }
    
    const party = this.parties.get(partyId);
    if (!party) {
      return null;
    }
    
    party.members.delete(memberId);
    this.memberToParty.delete(memberId);
    
    // If party is empty, remove it
    if (party.members.size === 0) {
      this.removeParty(partyId);
      return null;
    }
    
    // If host left, transfer host to first remaining member
    if (party.hostId === memberId) {
      const newHost = party.members.values().next().value;
      if (newHost) {
        party.hostId = newHost.id;
        newHost.isHost = true;
        this.log.info(`Host transferred to ${newHost.name} in party ${partyId}`);
      }
    }
    
    this.log.info(`${memberId} left party ${partyId}`);
    
    return party;
  }

  getParty(partyId: string): Party | null {
    return this.parties.get(partyId) || null;
  }

  getPartyByCode(partyCode: string): Party | null {
    const partyId = this.partyCodeToId.get(partyCode);
    if (!partyId) return null;
    return this.getParty(partyId);
  }

  getPartyByMember(memberId: string): Party | null {
    const partyId = this.memberToParty.get(memberId);
    if (!partyId) return null;
    return this.getParty(partyId);
  }

  updateMemberStatus(memberId: string, isConnected: boolean, inGame?: boolean): Party | null {
    const party = this.getPartyByMember(memberId);
    if (!party) return null;
    
    const member = party.members.get(memberId);
    if (member) {
      member.isConnected = isConnected;
      if (inGame !== undefined) {
        member.inGame = inGame;
      }
    }
    
    return party;
  }

  setPartyInGame(partyId: string, gameId: GameID, workerIndex?: number): void {
    const party = this.parties.get(partyId);
    if (party) {
      party.inGame = true;
      party.gameId = gameId;
      party.workerIndex = workerIndex;
      this.log.info(`Party ${partyId} started game ${gameId} on worker ${workerIndex}`);
    }
  }
  
  setMemberInGame(memberId: string, gameId: GameID | null): void {
    const party = this.getPartyByMember(memberId);
    if (!party) return;
    
    const member = party.members.get(memberId);
    if (!member) return;
    
    if (gameId) {
      // Member joined a game
      member.inGame = true;
      party.memberGames.set(memberId, { gameId, joinedAt: Date.now() });
      this.log.info(`Party member ${memberId} joined game ${gameId}`);
    } else {
      // Member left game
      member.inGame = false;
      party.memberGames.delete(memberId);
      this.log.info(`Party member ${memberId} left game`);
    }
  }

  getPartyMembers(partyId: string): PartyMember[] {
    const party = this.parties.get(partyId);
    if (!party) return [];
    return Array.from(party.members.values());
  }

  private generatePartyCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    
    // Generate unique code
    do {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.partyCodeToId.has(code));
    
    return code;
  }

  private removeParty(partyId: string): void {
    const party = this.parties.get(partyId);
    if (!party) return;
    
    // Clean up all references
    for (const [code, id] of this.partyCodeToId.entries()) {
      if (id === partyId) {
        this.partyCodeToId.delete(code);
        break;
      }
    }
    
    for (const memberId of party.members.keys()) {
      this.memberToParty.delete(memberId);
    }
    
    this.parties.delete(partyId);
    this.log.info(`Party ${partyId} removed`);
  }

  updateHostActivity(partyCode: string, hostId: string, activity: string, selectedLobby?: { gameID: string; mapName?: string }): boolean {
    const party = this.getPartyByCode(partyCode);
    if (!party || party.hostId !== hostId) {
      return false;
    }
    
    party.hostActivity = activity;
    party.hostSelectedLobby = selectedLobby || undefined;
    
    this.log.info(`Host activity updated for party ${party.id}: ${activity}`);
    return true;
  }

  private cleanupStaleParties(): void {
    const now = Date.now();
    const staleTimeout = 30 * 60 * 1000; // 30 minutes
    
    for (const [partyId, party] of this.parties) {
      // Remove parties older than 30 minutes with no connected members
      const hasConnectedMembers = Array.from(party.members.values()).some(m => m.isConnected);
      
      if (!hasConnectedMembers && now - party.createdAt > staleTimeout) {
        this.log.info(`Cleaning up stale party ${partyId}`);
        this.removeParty(partyId);
      }
    }
  }
}