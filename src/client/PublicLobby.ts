import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import { GameMode } from "../core/game/Game";
import { GameID, GameInfo } from "../core/Schemas";
import { generateID } from "../core/Util";
import { JoinLobbyEvent } from "./Main";
import { getMapsImage } from "./utilities/Maps";

@customElement("public-lobby")
export class PublicLobby extends LitElement {
  @state() private lobbies: GameInfo[] = [];
  @state() public isLobbyHighlighted: boolean = false;
  @state() private isButtonDebounced: boolean = false;
  private lobbiesInterval: number | null = null;
  private currLobby: GameInfo | null = null;
  private debounceDelay: number = 750;
  private lobbyIDToStart = new Map<GameID, number>();

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    // Reset highlight state on component mount
    this.isLobbyHighlighted = false;
    this.currLobby = null;
    
    this.fetchAndUpdateLobbies();
    this.lobbiesInterval = window.setInterval(
      () => this.fetchAndUpdateLobbies(),
      1000,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.lobbiesInterval !== null) {
      clearInterval(this.lobbiesInterval);
      this.lobbiesInterval = null;
    }
  }

  private async fetchAndUpdateLobbies(): Promise<void> {
    try {
      this.lobbies = await this.fetchLobbies();
      // Only log when lobbies change significantly
      if (this.lobbies.length > 0) {
        const newLobbyIds = new Set(this.lobbies.map(l => l.gameID));
        const oldLobbyIds = new Set(Array.from(this.lobbyIDToStart.keys()));
        const hasNewLobbies = this.lobbies.some(l => !oldLobbyIds.has(l.gameID));
        
        if (hasNewLobbies) {
          console.log(`New lobbies available: ${this.lobbies.length} total`);
        }
      }
      
      this.lobbies.forEach((l) => {
        // Store the start time on first fetch because endpoint is cached, causing
        // the time to appear irregular.
        if (!this.lobbyIDToStart.has(l.gameID)) {
          const msUntilStart = l.msUntilStart ?? 0;
          this.lobbyIDToStart.set(l.gameID, msUntilStart + Date.now());
        }
      });
      
      // Force a re-render to update the countdown timer
      this.requestUpdate();
    } catch (error) {
      console.error("Error fetching lobbies:", error);
    }
  }

  async fetchLobbies(): Promise<GameInfo[]> {
    try {
      const response = await fetch(`/api/public_lobbies`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.lobbies;
    } catch (error) {
      console.error("Error fetching lobbies:", error);
      throw error;
    }
  }

  public stop() {
    if (this.lobbiesInterval !== null) {
      this.isLobbyHighlighted = false;
      clearInterval(this.lobbiesInterval);
      this.lobbiesInterval = null;
    }
  }

  render() {
    // Get valid lobbies that haven't started yet
    const validLobbies = this.lobbies
      .filter(l => {
        if (!l?.gameConfig) return false;
        const start = this.lobbyIDToStart.get(l.gameID) ?? 0;
        const timeRemaining = Math.max(0, Math.floor((start - Date.now()) / 1000));
        return timeRemaining > 0; // Only show lobbies that haven't started
      });

    // Separate FFA and Team games
    const ffaLobbies = validLobbies.filter(l => l.gameConfig!.gameMode === GameMode.FFA);
    const teamLobbies = validLobbies.filter(l => l.gameConfig!.gameMode === GameMode.Team);

    // Try to maintain one of each type if possible
    let slot1: GameInfo | null = null;
    let slot2: GameInfo | null = null;

    // Prioritize showing one FFA and one Team game
    if (ffaLobbies.length > 0 && teamLobbies.length > 0) {
      slot1 = ffaLobbies[0];
      slot2 = teamLobbies[0];
    } else if (ffaLobbies.length >= 2) {
      slot1 = ffaLobbies[0];
      slot2 = ffaLobbies[1];
    } else if (teamLobbies.length >= 2) {
      slot1 = teamLobbies[0];
      slot2 = teamLobbies[1];
    } else if (ffaLobbies.length === 1) {
      slot1 = ffaLobbies[0];
      slot2 = teamLobbies[0] || null;
    } else if (teamLobbies.length === 1) {
      slot1 = teamLobbies[0];
      slot2 = ffaLobbies[0] || null;
    }

    // Always show 2 game slots
    const lobbySlots: (GameInfo | null)[] = [slot1, slot2];

    return html`
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-5xl mx-auto">
        ${lobbySlots.map((lobby, index) => {
          if (!lobby) {
            // Empty slot - show a loading placeholder with animation
            return html`
              <div class="relative h-32 sm:h-36 md:h-44 rounded-xl overflow-hidden"
                   style="background: linear-gradient(135deg, #1a1f15 0%, #0d1108 100%); 
                          border: 2px dashed #2d3b25; 
                          opacity: 0.7;">
                <div class="flex items-center justify-center h-full text-gray-400">
                  <div class="text-center">
                    <div class="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading New Game...
                    </div>
                    <div class="text-sm opacity-60">A new game will appear shortly</div>
                  </div>
                </div>
              </div>
            `;
          }
          
          const start = this.lobbyIDToStart.get(lobby.gameID) ?? 0;
          const timeRemaining = Math.max(0, Math.floor((start - Date.now()) / 1000));
          const minutes = Math.floor(timeRemaining / 60);
          const seconds = timeRemaining % 60;
          const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

          const teamCount = lobby.gameConfig!.gameMode === GameMode.Team
            ? lobby.gameConfig!.playerTeams || 0
            : null;

          const isHighlighted = this.currLobby?.gameID === lobby.gameID && this.isLobbyHighlighted;
          const isTeamMode = lobby.gameConfig!.gameMode === GameMode.Team;
          const highlightColor = isTeamMode ? '#3b82f6' : '#ef4444'; // Blue for Team, Red for FFA
          const isStartingSoon = timeRemaining < 2; // Less than 2 seconds

          return html`
            <button
              @click=${() => this.lobbyClicked(lobby)}
              ?disabled=${this.isButtonDebounced || isStartingSoon}
              class="relative h-32 sm:h-36 md:h-44 rounded-xl overflow-hidden group
                     transition-all duration-300 ${isStartingSoon ? '' : 'hover:scale-[1.02] hover:shadow-2xl'}
                     ${this.isButtonDebounced || isStartingSoon ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                     ${isHighlighted && !isStartingSoon ? (isTeamMode ? "ring-4 ring-blue-500 ring-opacity-75" : "ring-4 ring-red-500 ring-opacity-75") : ""}"
              style="background: ${isStartingSoon ? 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)' : 'linear-gradient(135deg, #2d3b25 0%, #1a1f15 100%)'}; 
                     border: 2px solid ${isHighlighted && !isStartingSoon ? highlightColor : (isStartingSoon ? '#3a3a3a' : '#4a5f3a')}; 
                     box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);">
              
              <!-- Map background image -->
              <img
                src="${getMapsImage(lobby.gameConfig!.gameMap)}"
                alt="${lobby.gameConfig!.gameMap}"
                class="absolute inset-0 w-full h-full object-cover ${isStartingSoon ? 'opacity-10' : 'opacity-30 group-hover:opacity-40'} transition-opacity duration-300"
                style="filter: ${isStartingSoon ? 'grayscale(1) contrast(0.5) brightness(0.3)' : 'contrast(1.2) brightness(0.8)'};"
              />
              
              <!-- Gradient overlay -->
              <div class="absolute inset-0" 
                   style="background: linear-gradient(to bottom, 
                          rgba(0,0,0,0.1) 0%, 
                          rgba(0,0,0,0.4) 50%, 
                          rgba(0,0,0,0.8) 100%);">
              </div>
              
              <!-- Content -->
              <div class="relative h-full flex flex-col justify-between p-3 sm:p-4 text-white">
                <!-- Top section -->
                <div>
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="text-xs sm:text-sm font-medium text-green-400 uppercase tracking-wider mb-1">
                        ${translateText("public_lobby.join")}
                      </div>
                      <div class="text-lg sm:text-xl md:text-2xl font-bold leading-tight">
                        ${translateText(`map.${lobby.gameConfig!.gameMap.toLowerCase().replace(/\s+/g, "")}`)}
                      </div>
                    </div>
                    <!-- Game mode badge -->
                    <div class="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold"
                         style="${lobby.gameConfig!.gameMode === GameMode.Team
                           ? 'background: rgba(59, 130, 246, 0.3); border: 1px solid rgba(59, 130, 246, 0.6); color: #60a5fa;'
                           : 'background: rgba(239, 68, 68, 0.3); border: 1px solid rgba(239, 68, 68, 0.6); color: #f87171;'}">
                      ${lobby.gameConfig!.gameMode === GameMode.Team
                        ? `${teamCount} Teams`
                        : "FFA"}
                    </div>
                  </div>
                </div>
                
                <!-- Bottom section -->
                <div class="flex items-end justify-between">
                  <!-- Player count -->
                  <div class="flex items-center gap-2">
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
                      </svg>
                      <span class="text-sm sm:text-base font-bold">
                        ${lobby.numClients}/${lobby.gameConfig!.maxPlayers}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Timer -->
                  <div class="flex items-center gap-1 px-3 py-1 rounded-lg"
                       style="background: ${isStartingSoon ? 'rgba(100, 100, 100, 0.2)' : 'rgba(255, 255, 0, 0.1)'}; 
                              border: 1px solid ${isStartingSoon ? 'rgba(100, 100, 100, 0.3)' : 'rgba(255, 255, 0, 0.3)'};">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 ${isStartingSoon ? 'text-gray-500' : 'text-yellow-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="text-base sm:text-lg md:text-xl font-bold ${isStartingSoon ? 'text-gray-500' : 'text-yellow-300'}">
                      ${timeDisplay}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          `;
        })}
      </div>
    `;
  }

  leaveLobby() {
    this.isLobbyHighlighted = false;
    this.currLobby = null;
  }

  private lobbyClicked(lobby: GameInfo) {
    // Check if user is in party as non-host
    const partySystem = document.querySelector('party-system') as any;
    if (partySystem?.isInPartyAsNonHost && partySystem.isInPartyAsNonHost()) {
      // Don't allow non-host party members to join games
      return;
    }
    
    if (this.isButtonDebounced) {
      return;
    }
    
    // Check if lobby is about to start (less than 2 seconds remaining)
    const start = this.lobbyIDToStart.get(lobby.gameID) ?? 0;
    const timeRemaining = Math.max(0, Math.floor((start - Date.now()) / 1000));
    if (timeRemaining < 2) {
      console.log("Cannot join lobby - starting too soon (less than 2 seconds)");
      return;
    }

    // Set debounce state
    this.isButtonDebounced = true;

    // Reset debounce after delay
    setTimeout(() => {
      this.isButtonDebounced = false;
    }, this.debounceDelay);

    // Don't allow clicking on empty slots
    if (!lobby) {
      return;
    }

    if (this.currLobby === null) {
      this.isLobbyHighlighted = true;
      this.currLobby = lobby;
      
      // If user is party host, dispatch event about selected lobby
      if (partySystem?.isHost && partySystem.isHost()) {
        const mapName = lobby.gameConfig?.gameMap || 'Unknown';
        window.dispatchEvent(new CustomEvent("host-selected-lobby", {
          detail: {
            gameID: lobby.gameID,
            mapName: mapName
          },
          bubbles: true,
          composed: true
        }));
      }
      
      // Get party info if available
      const partyInfo = partySystem?.getPartyInfo ? partySystem.getPartyInfo() : null;
      
      this.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: {
            gameID: lobby.gameID,
            clientID: generateID(),
            partyId: partyInfo?.partyId,
          } as JoinLobbyEvent,
          bubbles: true,
          composed: true,
        }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("leave-lobby", {
          detail: { lobby: this.currLobby },
          bubbles: true,
          composed: true,
        }),
      );
      this.leaveLobby();
    }
  }
}
