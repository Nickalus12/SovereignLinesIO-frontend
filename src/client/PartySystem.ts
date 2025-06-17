import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "./Utils";
import { generateID } from "../core/Util";
import { JoinLobbyEvent } from "./Main";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { GameType } from "../core/game/Game";
import { 
  ClientPartyMessage, 
  ServerPartyMessage,
  PartyMember 
} from "../core/Schemas";

@customElement("party-system")
export class PartySystem extends LitElement {
  @state() private isInParty: boolean = false;
  @state() private partyCode: string = "";
  @state() private partyId: string = "";
  @state() private members: PartyMember[] = [];
  @state() private hostId: string = "";
  @state() private myId: string = "";
  @state() private joinCode: string = "";
  @state() private isExpanded: boolean = false;
  @state() private copiedToClipboard: boolean = false;
  @state() private errorMessage: string = "";
  @state() private isConnecting: boolean = false;
  @state() private isCreatingLobby: boolean = false;
  @state() private hostActivity: string = "";
  @state() private hostSelectedLobby: { gameID: string; mapName?: string } | null = null;

  private updateInterval: number | null = null;
  private reconnectTimer: number | null = null;
  private config = getServerConfigFromClient();
  private lastJoinedGameId: string = "";
  private isJoiningGame: boolean = false;
  private currentGameId: string = "";

  static styles = css`
    :host {
      display: block;
      margin: 1rem 0;
    }
  `;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.myId = this.getMyPlayerId();
    
    // Listen for game events
    window.addEventListener("join-game", this.handleGameJoin.bind(this));
    window.addEventListener("game-ended", this.handleGameEnded.bind(this));
    window.addEventListener("game-started", this.handleGameStarted.bind(this));
    window.addEventListener("leave-lobby", this.handleLeaveLobby.bind(this));
    
    // Listen for host activity events
    window.addEventListener("host-creating-lobby", this.handleHostCreatingLobby.bind(this));
    window.addEventListener("host-selected-lobby", this.handleHostSelectedLobby.bind(this));
    
    // Restore party state from localStorage
    this.restorePartyState();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnect();
    window.removeEventListener("join-game", this.handleGameJoin.bind(this));
    window.removeEventListener("game-ended", this.handleGameEnded.bind(this));
    window.removeEventListener("game-started", this.handleGameStarted.bind(this));
    window.removeEventListener("leave-lobby", this.handleLeaveLobby.bind(this));
    window.removeEventListener("host-creating-lobby", this.handleHostCreatingLobby.bind(this));
    window.removeEventListener("host-selected-lobby", this.handleHostSelectedLobby.bind(this));
  }

  private getMyPlayerId(): string {
    let playerId = localStorage.getItem("party_player_id");
    if (!playerId) {
      playerId = generateID();
      localStorage.setItem("party_player_id", playerId);
    }
    return playerId;
  }

  private getMyPlayerName(): string {
    const usernameInput = document.querySelector("username-input") as any;
    return usernameInput?.username || "Player";
  }

  private getMyPlayerFlag(): string {
    const flagInput = document.querySelector("flag-input") as any;
    return flagInput?.getCurrentFlag?.() || "xx";
  }

  private async connect(): Promise<void> {
    // No-op for HTTP-based implementation
    this.isConnecting = false;
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private startPolling(): void {
    if (this.isInParty && !this.updateInterval) {
      // Poll for updates every 2 seconds
      this.updateInterval = window.setInterval(() => {
        this.pollPartyStatus();
      }, 2000);
    }
  }

  private stopPolling(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async pollPartyStatus(): Promise<void> {
    if (!this.isInParty || !this.partyCode) return;
    
    try {
      const config = await this.config;
      const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
      const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
      const response = await fetch(`${workerPath}/api/party/${this.partyCode}`);
      if (response.ok) {
        const data = await response.json();
        
        // Update host activity if present
        if (data.hostActivity) {
          this.hostActivity = data.hostActivity;
        }
        if (data.hostSelectedLobby) {
          this.hostSelectedLobby = data.hostSelectedLobby;
        }
        
        // Check if party has started a game
        if (data.gameId && data.inGame && !this.isHost() && 
            data.gameId !== this.lastJoinedGameId && !this.isJoiningGame) {
          // Party has joined a game, non-host members should follow
          console.log("Party poll detected game started:", data.gameId);
          this.lastJoinedGameId = data.gameId;
          this.handleServerMessage({
            type: "party",
            action: "start_game",
            gameId: data.gameId,
            workerIndex: data.workerIndex
          } as ServerPartyMessage);
        } else {
          // Regular update
          this.handleServerMessage({
            type: "party",
            action: "update",
            partyId: data.id,
            members: data.members,
            hostId: data.hostId
          } as ServerPartyMessage);
        }
      } else if (response.status === 404) {
        // Party no longer exists
        this.handleServerMessage({
          type: "party",
          action: "leave"
        } as ServerPartyMessage);
        // Clear saved state since party is gone
        this.clearPartyState();
      }
    } catch (error) {
      console.error("Error polling party status:", error);
    }
  }

  private handleServerMessage(message: ServerPartyMessage): void {
    switch (message.action) {
      case "create":
        if (message.partyCode && message.partyId) {
          this.partyCode = message.partyCode;
          this.partyId = message.partyId;
          this.members = message.members || [];
          this.hostId = message.hostId || this.myId;
          this.isInParty = true;
          this.isExpanded = true;
        } else if (message.error) {
          this.showError(message.error);
        }
        break;

      case "join":
        if (message.error) {
          this.showError(message.error);
        }
        break;

      case "update":
        if (message.members) {
          this.members = message.members;
        }
        if (message.hostId) {
          this.hostId = message.hostId;
        }
        // Save state on updates
        if (this.isInParty) {
          this.savePartyState();
        }
        break;

      case "leave":
        this.resetPartyState();
        this.clearPartyState();
        break;

      case "start_game":
        if (message.gameId && !this.isHost()) {
          // Non-host party members automatically join the game quickly
          const gameId = message.gameId; // Capture gameId to ensure it's defined
          console.log("Party member received start_game with gameId:", gameId);
          console.log("Worker index for game:", message.workerIndex);
          
          // Small delay to ensure host has connected, but quick enough for territory placement
          setTimeout(() => {
            this.joinGame(gameId);
          }, 500); // Reduced to 500ms to ensure time for territory placement
        } else if (message.error) {
          this.showError(message.error);
        }
        break;
    }
  }

  private async createParty() {
    this.isConnecting = true;
    
    try {
      const config = await this.config;
      // In development, webpack proxy handles routing, so no worker path needed
      const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
      const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
      const response = await fetch(`${workerPath}/api/party/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostId: this.myId,
          hostClientId: this.myId,
          hostName: this.getMyPlayerName(),
          hostFlag: this.getMyPlayerFlag()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create party");
      }

      const data = await response.json();
      
      if (data.partyCode && data.party) {
        this.partyCode = data.partyCode;
        this.partyId = data.party.id;
        this.members = data.party.members || [];
        this.hostId = data.party.hostId || this.myId;
        this.isInParty = true;
        this.isExpanded = true;
        
        // Save party state
        this.savePartyState();
        
        // Start polling for updates
        this.startPolling();
      } else {
        throw new Error(data.error || "Failed to create party");
      }
    } catch (error) {
      console.error("Error creating party:", error);
      this.showError("Failed to create party. Please try again.");
    } finally {
      this.isConnecting = false;
    }
  }

  private async joinParty() {
    if (!this.joinCode || this.joinCode.length !== 6) {
      this.showError("Please enter a valid 6-character party code");
      return;
    }

    this.isConnecting = true;
    
    try {
      const config = await this.config;
      const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
      const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
      const response = await fetch(`${workerPath}/api/party/join/${this.joinCode.toUpperCase()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: this.myId,
          memberClientId: this.myId,
          memberName: this.getMyPlayerName(),
          memberFlag: this.getMyPlayerFlag()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join party");
      }

      const data = await response.json();
      
      if (data.party) {
        // Check party size limit
        if (data.party.members && data.party.members.length >= 10) {
          throw new Error("Party is full (maximum 10 players)");
        }
        
        this.partyCode = this.joinCode.toUpperCase();
        this.partyId = data.party.id;
        this.members = data.party.members || [];
        this.hostId = data.party.hostId;
        this.isInParty = true;
        this.isExpanded = true;
        this.joinCode = "";
        
        // Save party state
        this.savePartyState();
        
        // Start polling for updates
        this.startPolling();
      } else {
        throw new Error(data.error || "Failed to join party");
      }
    } catch (error) {
      console.error("Error joining party:", error);
      this.showError(error.message || "Failed to join party. Please check the code and try again.");
    } finally {
      this.isConnecting = false;
    }
  }

  private async leaveParty() {
    if (this.partyCode && this.myId) {
      try {
        const config = await this.config;
        const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
        const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
        await fetch(`${workerPath}/api/party/leave/${this.myId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          }
        });
      } catch (error) {
        console.error("Error leaving party:", error);
      }
    }
    
    this.resetPartyState();
    this.clearPartyState();
    this.disconnect();
  }

  private resetPartyState() {
    this.isInParty = false;
    this.partyCode = "";
    this.partyId = "";
    this.members = [];
    this.hostId = "";
    this.isExpanded = false;
    this.lastJoinedGameId = "";
    this.isJoiningGame = false;
    this.currentGameId = "";
    this.stopPolling();
  }


  private async joinGame(gameId: string) {
    if (this.isJoiningGame) {
      console.log("Already joining a game, skipping duplicate join");
      return;
    }
    
    this.isJoiningGame = true;
    
    console.log(`Party member joining game ${gameId}`);
    console.log(`Party member has partyId: ${this.partyId}`);
    
    // Ensure we use the same worker as the host
    const config = await this.config;
    const workerIndex = this.getWorkerIndex(gameId);
    console.log(`Game ${gameId} is on worker ${workerIndex}`);
    
    // Dispatch join game event with party info
    const event = new CustomEvent("join-lobby", {
      detail: {
        gameID: gameId,
        clientID: generateID(),
        partyId: this.partyId  // Include party ID
      } as JoinLobbyEvent,
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(event);
    
    // Reset joining state after a delay
    setTimeout(() => {
      this.isJoiningGame = false;
    }, 5000);
  }
  
  private getWorkerIndex(gameId: string): number {
    // Simple hash function to determine worker index
    let hash = 0;
    for (let i = 0; i < gameId.length; i++) {
      const char = gameId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 2; // Assuming 2 workers in dev mode
  }

  private handleGameJoin(event: CustomEvent) {
    // Track that we're joining a game
    const gameId = event.detail?.gameID;
    if (gameId) {
      this.currentGameId = gameId;
      this.updateMemberGameStatus(gameId);
    }
  }

  private handleGameEnded(event: Event) {
    // Reset game-related state when game ends
    this.lastJoinedGameId = "";
    this.isJoiningGame = false;
    this.currentGameId = "";
    console.log("Game ended, reset party game state");
    
    // Update member status to show they're back in menu
    this.updateMemberStatus(false);
    this.updateMemberGameStatus(null);
  }
  
  private handleGameStarted(event: CustomEvent) {
    // Update member status to show they're in game
    const gameId = event.detail?.gameID || this.currentGameId;
    this.updateMemberStatus(true);
    if (gameId) {
      this.updateMemberGameStatus(gameId);
    }
  }
  
  private handleLeaveLobby(event: Event) {
    // Update member status to show they're back in menu
    this.currentGameId = "";
    this.updateMemberStatus(false);
    this.updateMemberGameStatus(null);
  }
  
  private async updateMemberStatus(inGame: boolean) {
    if (!this.isInParty || !this.partyCode) return;
    
    try {
      const config = await this.config;
      const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
      const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
      
      await fetch(`${workerPath}/api/party/status/${this.partyCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: this.myId,
          inGame: inGame,
          isConnected: true
        })
      });
    } catch (error) {
      console.error("Error updating member status:", error);
    }
  }
  
  private async updateMemberGameStatus(gameId: string | null) {
    if (!this.isInParty || !this.partyCode) return;
    
    try {
      const config = await this.config;
      const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
      const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
      
      await fetch(`${workerPath}/api/party/game/${this.partyCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: this.myId,
          gameId: gameId
        })
      });
    } catch (error) {
      console.error("Error updating member game status:", error);
    }
  }
  
  private async handleHostCreatingLobby(event: Event) {
    if (!this.isHost() || !this.isInParty) return;
    
    this.hostActivity = "Creating private lobby...";
    this.hostSelectedLobby = null;
    
    // Update server with host activity
    try {
      const config = await this.config;
      const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
      const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
      
      await fetch(`${workerPath}/api/party/activity/${this.partyCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostId: this.myId,
          activity: "creating_lobby",
          selectedLobby: null
        })
      });
    } catch (error) {
      console.error("Error updating host activity:", error);
    }
  }
  
  private async handleHostSelectedLobby(event: CustomEvent) {
    if (!this.isHost() || !this.isInParty) return;
    
    const { gameID, mapName } = event.detail;
    this.hostActivity = `Joining ${mapName}...`;
    this.hostSelectedLobby = { gameID, mapName };
    
    // Update server with host activity
    try {
      const config = await this.config;
      const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
      const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
      
      await fetch(`${workerPath}/api/party/activity/${this.partyCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostId: this.myId,
          activity: "selecting_lobby",
          selectedLobby: { gameID, mapName }
        })
      });
    } catch (error) {
      console.error("Error updating host activity:", error);
    }
  }

  public isInPartyAsNonHost(): boolean {
    return this.isInParty && !this.isHost();
  }
  
  public getPartyInfo(): { isInParty: boolean; isHost: boolean; partyCode: string; partyId: string } {
    return {
      isInParty: this.isInParty,
      isHost: this.isHost(),
      partyCode: this.partyCode,
      partyId: this.partyId
    };
  }
  
  public async hostJoiningGame(lobby: { gameID: string, clientID?: string }) {
    // Called when the party host is joining a game
    // Party members should automatically follow
    if (!this.isInParty || !this.isHost()) {
      return;
    }

    console.log("Party host joining game:", lobby.gameID);
    console.log("Worker index for game:", this.getWorkerIndex(lobby.gameID));
    
    // No delay - we need party members to join quickly due to territory placement time limit
    try {
      const config = await this.config;
      const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
      const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
      
      // Store the game info for members
      this.lastJoinedGameId = lobby.gameID;
      
      // Notify the server that the party is joining a game
      const response = await fetch(`${workerPath}/api/party/start/${this.partyCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostId: this.myId,
          gameId: lobby.gameID
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Party notified of game start, response:", data);
      } else {
        console.error("Failed to notify party of game start:", await response.text());
      }
    } catch (error) {
      console.error("Error notifying party of game join:", error);
    }
  }

  private copyPartyCode() {
    if (this.partyCode) {
      navigator.clipboard.writeText(this.partyCode).then(() => {
        this.copiedToClipboard = true;
        setTimeout(() => {
          this.copiedToClipboard = false;
        }, 2000);
      });
    }
  }

  private isHost(): boolean {
    return this.hostId === this.myId;
  }

  private showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = "";
    }, 3000);
  }
  
  private savePartyState() {
    if (this.isInParty && this.partyCode) {
      const partyState = {
        partyCode: this.partyCode,
        partyId: this.partyId,
        isHost: this.isHost(),
        savedAt: Date.now()
      };
      localStorage.setItem("party_state", JSON.stringify(partyState));
    }
  }
  
  private async restorePartyState() {
    const savedState = localStorage.getItem("party_state");
    if (!savedState) return;
    
    try {
      const state = JSON.parse(savedState);
      
      // Check if saved state is still recent (within 24 hours)
      if (Date.now() - state.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem("party_state");
        return;
      }
      
      // Try to rejoin the party
      this.isConnecting = true;
      
      const config = await this.config;
      const isDev = window.location.hostname === 'localhost' && window.location.port === '9000';
      const workerPath = isDev ? '' : (config.numWorkers() > 1 ? '/w0' : '');
      
      // First check if party still exists
      const checkResponse = await fetch(`${workerPath}/api/party/${state.partyCode}`);
      
      if (checkResponse.ok) {
        const partyData = await checkResponse.json();
        
        // Check if we're still a member
        const stillMember = partyData.members.some((m: any) => m.id === this.myId);
        
        if (stillMember) {
          // Restore party state
          this.partyCode = state.partyCode;
          this.partyId = partyData.id;
          this.members = partyData.members || [];
          this.hostId = partyData.hostId;
          this.isInParty = true;
          this.isExpanded = true;
          
          // Start polling
          this.startPolling();
          
          // Update our connection status
          this.updateMemberStatus(false);
          
          console.log("Successfully restored party state");
        } else {
          // We're no longer in this party
          localStorage.removeItem("party_state");
        }
      } else {
        // Party no longer exists
        localStorage.removeItem("party_state");
      }
    } catch (error) {
      console.error("Error restoring party state:", error);
      localStorage.removeItem("party_state");
    } finally {
      this.isConnecting = false;
    }
  }
  
  private clearPartyState() {
    localStorage.removeItem("party_state");
  }

  private toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }



  render() {
    return html`
      <div class="party-container ${this.isExpanded ? 'expanded' : ''}"
           style="background: rgba(13, 17, 8, 0.85); 
                  backdrop-filter: blur(12px); 
                  border: 1px solid rgba(74, 95, 58, 0.3);
                  border-radius: 16px;
                  padding: 0.75rem 1rem;
                  margin: 0.75rem auto;
                  max-width: 500px;
                  transition: all 0.3s ease;
                  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
        
        <!-- Header -->
        <div class="party-header flex items-center justify-between cursor-pointer select-none"
             @click=${this.toggleExpanded}>
          <div class="flex items-center gap-3">
            <div class="relative">
              <svg class="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
              </svg>
              ${this.isInParty ? html`
                <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              ` : ''}
            </div>
            <div>
              <h3 class="text-base font-bold text-white m-0">
                ${this.isInParty ? 'Party' : 'Party System'}
              </h3>
              ${this.isInParty ? html`
                <div class="text-xs text-gray-400">${this.members.length} ${this.members.length === 1 ? 'player' : 'players'}</div>
              ` : ''}
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${this.isInParty && !this.isExpanded ? html`
              <div class="flex items-center gap-2">
                ${!this.isHost() ? html`
                  <svg class="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                ` : ''}
                <div class="text-xs font-mono text-gray-400">${this.partyCode}</div>
              </div>
            ` : ''}
            <svg class="w-4 h-4 text-gray-400 transform transition-transform ${this.isExpanded ? 'rotate-180' : ''}"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>

        ${this.isExpanded ? html`
          <div class="party-content mt-4">
            ${!this.isInParty ? html`
              <!-- Not in party - Show create/join options -->
              <div class="flex flex-col gap-2">
                <button @click=${this.createParty}
                        ?disabled=${this.isConnecting}
                        class="w-full px-3 py-2.5 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.01] ${this.isConnecting ? 'opacity-50 cursor-not-allowed' : ''}"
                        style="background: linear-gradient(135deg, #4a5f3a 0%, #2d3b25 100%);
                               border: 1px solid rgba(74, 95, 58, 0.6);
                               box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);">
                  <div class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Create New Party
                  </div>
                </button>
                
                <div class="relative">
                  <div class="text-xs text-gray-500 text-center mb-2">— or —</div>
                </div>
                
                <div class="flex gap-2">
                  <input type="text"
                         .value=${this.joinCode}
                         @input=${(e: any) => this.joinCode = e.target.value.toUpperCase()}
                         placeholder="ENTER CODE"
                         maxlength="6"
                         class="flex-1 px-3 py-2.5 text-white placeholder-gray-500 rounded-lg text-center focus:outline-none transition-all"
                         style="background: rgba(0, 0, 0, 0.4);
                                border: 1px solid rgba(74, 95, 58, 0.3);
                                font-family: monospace;
                                letter-spacing: 0.2em;
                                font-size: 14px;">
                  <button @click=${this.joinParty}
                          ?disabled=${this.isConnecting}
                          class="px-5 py-2.5 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] ${this.isConnecting ? 'opacity-50 cursor-not-allowed' : ''}"
                          style="background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%);
                                 border: 1px solid rgba(59, 130, 246, 0.4);
                                 box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);">
                    Join
                  </button>
                </div>

                ${this.errorMessage ? html`
                  <div class="text-red-400 text-xs text-center mt-1">${this.errorMessage}</div>
                ` : ''}
              </div>
            ` : html`
              <!-- In party - Show party info -->
              <div class="flex flex-col gap-2">
                <!-- Party Code Display -->
                <div class="flex items-center justify-between p-2.5 rounded-lg"
                     style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(74, 95, 58, 0.2);">
                  <div class="flex items-center gap-3">
                    <div>
                      <div class="text-xs text-gray-500 mb-0.5">Party Code</div>
                      <div class="text-lg font-bold text-green-400" style="font-family: monospace; letter-spacing: 0.15em;">
                        ${this.partyCode}
                      </div>
                    </div>
                  </div>
                  <button @click=${this.copyPartyCode}
                          class="px-3 py-1.5 text-xs text-gray-300 rounded-md transition-all duration-300 hover:text-white"
                          style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);">
                    <div class="flex items-center gap-1.5">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                      ${this.copiedToClipboard ? 'Copied!' : 'Copy'}
                    </div>
                  </button>
                </div>
                
                ${!this.isHost() ? html`
                  <!-- Host control indicator for party members -->
                  <div class="mt-3 p-2.5 rounded-lg text-center"
                       style="background: rgba(251, 146, 60, 0.1); 
                              border: 1px solid rgba(251, 146, 60, 0.3);">
                    <div class="flex items-center justify-center gap-2 text-orange-400">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      <span class="text-sm font-medium">Host Controlled</span>
                    </div>
                    <div class="text-xs text-orange-300 mt-1 opacity-75">
                      The party host controls game selection
                    </div>
                    
                    ${this.hostActivity ? html`
                      <div class="mt-3 p-2 rounded-md"
                           style="background: rgba(0, 0, 0, 0.3); 
                                  border: 1px solid rgba(251, 146, 60, 0.2);">
                        <div class="text-xs text-orange-300 font-medium">
                          Host Activity
                        </div>
                        <div class="text-sm text-white mt-1">
                          ${this.hostActivity}
                        </div>
                        ${this.hostSelectedLobby ? html`
                          <div class="text-xs text-gray-400 mt-1">
                            Game ID: ${this.hostSelectedLobby.gameID.substring(0, 8)}...
                          </div>
                        ` : ''}
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

                <!-- Party Members -->
                <div class="space-y-1.5">
                  <div class="text-xs text-gray-500 mb-1">Party Members</div>
                  ${this.members.map((member) => html`
                    <div class="flex items-center justify-between p-2 rounded-lg transition-all"
                         style="background: rgba(0, 0, 0, 0.2); border: 1px solid ${member.id === this.myId ? 'rgba(74, 95, 58, 0.4)' : 'rgba(74, 95, 58, 0.15)'};">
                      <div class="flex items-center gap-2.5">
                        <div class="relative">
                          <img src="/flags/${member.flag || 'xx'}.svg" 
                               alt="${member.flag || 'xx'}" 
                               class="w-5 h-3.5 object-cover rounded"
                               style="border: 1px solid rgba(255, 255, 255, 0.1);"
                               onerror="this.src='/flags/xx.svg'; this.onerror=null;">
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-sm text-white ${member.id === this.myId ? 'font-semibold' : ''}">${member.name}</span>
                          ${member.id === this.myId ? html`
                            <span class="text-xs text-gray-500">(You)</span>
                          ` : ''}
                          ${member.isHost ? html`
                            <span class="px-1.5 py-0.5 text-xs rounded"
                                  style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3);">
                              Host
                            </span>
                          ` : ''}
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        ${member.inGame ? html`
                          <span class="text-xs text-orange-400">In Game</span>
                        ` : ''}
                        <div class="w-2 h-2 rounded-full ${member.isConnected && !member.inGame ? 'bg-green-400' : member.inGame ? 'bg-orange-400' : 'bg-red-400'}"
                             style="box-shadow: 0 0 4px ${member.isConnected && !member.inGame ? 'rgba(74, 222, 128, 0.5)' : member.inGame ? 'rgba(251, 146, 60, 0.5)' : 'rgba(239, 68, 68, 0.5)'};"></div>
                      </div>
                    </div>
                  `)}
                </div>

                <!-- Leave Party Button -->
                <button @click=${this.leaveParty}
                        class="w-full px-3 py-2 mt-2 text-gray-300 font-medium rounded-lg transition-all duration-300 hover:text-white"
                        style="background: rgba(239, 68, 68, 0.1);
                               border: 1px solid rgba(239, 68, 68, 0.3);">
                  Leave Party
                </button>

                ${this.errorMessage ? html`
                  <div class="text-red-400 text-xs text-center mt-1">${this.errorMessage}</div>
                ` : ''}
              </div>
            `}
          </div>
        ` : ''}
      </div>
    `;
  }
}