import page from "page";
import favicon from "../../resources/images/Favicon.svg";
import { GameRecord, GameStartInfo } from "../core/Schemas";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { GameType } from "../core/game/Game";
import { UserSettings } from "../core/game/UserSettings";
import { joinLobby } from "./ClientGameRunner";
import { translationManager } from "./TranslationManager";
import "./DarkModeButton";
import { DarkModeButton } from "./DarkModeButton";
import "./FlagInput";
import { FlagInput } from "./FlagInput";
import { GameStartingModal } from "./GameStartingModal";
import { HelpModal } from "./HelpModal";
import { HostLobbyModal as HostPrivateLobbyModal } from "./HostLobbyModal";
import { JoinPrivateLobbyModal } from "./JoinPrivateLobbyModal";
import { LanguageModal } from "./LanguageModal";
import { NewsModal } from "./NewsModal";
import "./PublicLobby";
import { PublicLobby } from "./PublicLobby";
import { SinglePlayerModal } from "./SinglePlayerModal";
import { UserSettingModal } from "./UserSettingModal";
import "./UsernameInput";
import { UsernameInput } from "./UsernameInput";
import { generateCryptoRandomUUID } from "./Utils";
import "./components/NewsButton";
import { NewsButton } from "./components/NewsButton";
import "./PartySystem";
import { PartySystem } from "./PartySystem";
import { SubscriptionButton } from "./components/SubscriptionButtonSimple";
import "./components/baseComponents/Button";
import { OButton } from "./components/baseComponents/Button";
import "./components/baseComponents/Modal";
import { discordLogin, getUserMe, isLoggedIn, logOut } from "./jwt";
import "./auth/LoginModal";
import { LoginModal } from "./auth/LoginModal";
import "./auth/RegisterModal";
import { RegisterModal } from "./auth/RegisterModal";
import "./auth/ProfileDropdown";
import { ProfileDropdown } from "./auth/ProfileDropdown";
import "./auth/AccountSettingsModal";
import { AccountSettingsModal } from "./auth/AccountSettingsModal";
import "./auth/PasswordResetModal";
import { PasswordResetModal } from "./auth/PasswordResetModal";
import { authService } from "./auth/AuthService";
import { statsTracker } from "./auth/StatsTracker";
import "./auth/TermsAcceptanceModal";
import { TermsAcceptanceModal, checkTermsAcceptance } from "./auth/TermsAcceptanceModal";
import "./styles.css";
import { UIManager } from "./graphics/UIManager";

export interface JoinLobbyEvent {
  clientID: string;
  // Multiplayer games only have gameID, gameConfig is not known until game starts.
  gameID: string;
  // GameConfig only exists when playing a singleplayer game.
  gameStartInfo?: GameStartInfo;
  // GameRecord exists when replaying an archived game.
  gameRecord?: GameRecord;
  // Party ID if joining as part of a party
  partyId?: string;
}

// Utility function to set custom game server endpoint
(window as any).setGameServerEndpoint = (endpoint: string | null) => {
  if (endpoint === null) {
    localStorage.removeItem('gameServerEndpoint');
    console.log('Game server endpoint reset to use current host');
  } else {
    localStorage.setItem('gameServerEndpoint', endpoint);
    console.log(`Game server endpoint set to: ${endpoint}`);
  }
  console.log('You may need to refresh the page for changes to take effect');
};

class Client {
  private gameStop: (() => void) | null = null;

  private usernameInput: UsernameInput | null = null;
  private flagInput: FlagInput | null = null;
  private darkModeButton: DarkModeButton | null = null;

  private joinModal: JoinPrivateLobbyModal;
  private publicLobby: PublicLobby;
  private userSettings: UserSettings = new UserSettings();

  constructor() {}

  async initialize(): Promise<void> {
    // Set up party system observer
    this.setupPartySystemObserver();
    const gameVersion = document.getElementById(
      "game-version",
    ) as HTMLDivElement;
    if (!gameVersion) {
      console.warn("Game version element not found");
    }
    fetch("/version.txt")
      .then((response) => (response.ok ? response.text() : "Failed to load"))
      .then((version) => (gameVersion.innerText = version));

    const newsModal = document.querySelector("news-modal") as NewsModal;
    if (!newsModal) {
      console.warn("News modal element not found");
    }
    newsModal instanceof NewsModal;
    const newsButton = document.querySelector("news-button") as NewsButton;
    if (!newsButton) {
      console.warn("News button element not found");
    }
    
    // Hide the news button completely
    if (newsButton) {
      newsButton.hidden = true;
    }

    // Language selector is now in settings modal, no need to query for it here

    this.flagInput = document.querySelector("flag-input") as FlagInput;
    if (!this.flagInput) {
      console.warn("Flag input element not found");
    }

    this.darkModeButton = document.querySelector(
      "dark-mode-button",
    ) as DarkModeButton;
    if (!this.darkModeButton) {
      console.warn("Dark mode button element not found");
    }

    // Initialize subscription button
    const subscriptionContainer = document.getElementById("subscription-button-container-inline");
    if (subscriptionContainer) {
      new SubscriptionButton(subscriptionContainer);
    } else {
      console.warn("Subscription button container not found");
    }

    // Hide Discord login buttons - we're using custom auth now
    const loginDiscordButton = document.getElementById(
      "login-discord",
    ) as OButton;
    const logoutDiscordButton = document.getElementById(
      "logout-discord",
    ) as OButton;
    
    if (loginDiscordButton) {
      loginDiscordButton.style.display = "none";
    }
    if (logoutDiscordButton) {
      logoutDiscordButton.style.display = "none";
    }
    
    // Initialize custom auth components
    const profileDropdown = document.querySelector("profile-dropdown") as ProfileDropdown;
    const loginModal = document.querySelector("login-modal") as LoginModal;
    const registerModal = document.querySelector("register-modal") as RegisterModal;
    const accountSettingsModal = document.querySelector("account-settings-modal") as AccountSettingsModal;
    const passwordResetModal = document.querySelector("password-reset-modal") as PasswordResetModal;

    // First, get the username input element
    this.usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput;
    if (!this.usernameInput) {
      console.warn("Username input element not found");
    }

    // Initialize auth service and check authentication status
    try {
      const isAuthenticated = await authService.isAuthenticated();
      console.log('Auth service initialized, authenticated:', isAuthenticated);
      
      // If not authenticated, check if we have a username to create guest account
      if (!isAuthenticated && this.usernameInput) {
        const username = this.usernameInput.getCurrentUsername();
        if (username && username !== '' && username !== 'Anon000') {
          // Auto-login as guest with the username
          await authService.loginAsGuest(username);
          console.log('Auto-logged in as guest:', username);
        }
      }
    } catch (error) {
      console.warn('Auth service initialization failed:', error);
      // Clear any corrupted auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
    }

    // Initialize stats tracker for real-time stat updates
    console.log('Stats tracker initialized for game tracking');

    // Set up auth event listeners
    if (profileDropdown && loginModal) {
      console.log('Setting up auth event listeners');
      
      // Listen for show-login event from profile dropdown
      document.addEventListener('show-login', () => {
        console.log('Opening login modal');
        loginModal.open();
      });

      // Listen for show-register event
      document.addEventListener('show-register', () => {
        console.log('Opening register modal');
        if (registerModal) {
          registerModal.open();
        }
      });

      // Listen for show-account-settings event
      document.addEventListener('show-account-settings', () => {
        console.log('Opening account settings modal');
        if (accountSettingsModal) {
          accountSettingsModal.open();
        }
      });

      // Listen for show-forgot-password event
      document.addEventListener('show-forgot-password', () => {
        console.log('Opening password reset modal');
        if (passwordResetModal) {
          passwordResetModal.open();
        }
      });

      // Listen for login success to update UI
      document.addEventListener('login-success', async () => {
        console.log('Login successful, updating UI');
        // Profile dropdown will automatically update via auth state change
        
        // Check if user needs to accept terms
        await checkTermsAcceptance();
      });
      
      console.log('Auth event listeners set up successfully');
    } else {
      console.warn('Auth components not found:', {
        profileDropdown: !!profileDropdown,
        loginModal: !!loginModal,
        registerModal: !!registerModal,
        accountSettingsModal: !!accountSettingsModal,
        passwordResetModal: !!passwordResetModal
      });
    }

    this.publicLobby = document.querySelector("public-lobby") as PublicLobby;

    window.addEventListener("beforeunload", () => {
      console.log("Browser is closing");
      if (this.gameStop !== null) {
        this.gameStop();
      }
    });

    setFavicon();
    document.addEventListener("join-lobby", this.handleJoinLobby.bind(this));
    document.addEventListener("leave-lobby", this.handleLeaveLobby.bind(this));

    const spModal = document.querySelector(
      "single-player-modal",
    ) as SinglePlayerModal;
    spModal instanceof SinglePlayerModal;
    const singlePlayer = document.getElementById("single-player");
    if (singlePlayer === null) throw new Error("Missing single-player");
    singlePlayer.addEventListener("click", async () => {
      const partySystem = document.querySelector('party-system') as PartySystem;
      if (partySystem?.isInPartyAsNonHost()) {
        // Don't allow non-host party members to access this
        return;
      }
      if (this.usernameInput?.isValid()) {
        // Check if user is logged in and needs to accept terms
        const user = await authService.getCurrentUser();
        if (user) {
          await checkTermsAcceptance(() => {
            spModal.open();
          });
        } else {
          spModal.open();
        }
      }
    });

    // const ctModal = document.querySelector("chat-modal") as ChatModal;
    // ctModal instanceof ChatModal;
    // document.getElementById("chat-button").addEventListener("click", () => {
    //   ctModal.open();
    // });

    const hlpModal = document.querySelector("help-modal") as HelpModal;
    hlpModal instanceof HelpModal;
    const helpButton = document.getElementById("help-button");
    if (helpButton === null) throw new Error("Missing help-button");
    helpButton.addEventListener("click", () => {
      hlpModal.open();
    });

    // Discord login logic commented out - using custom auth system
    // The old Discord OAuth code is preserved here for reference but not used
    /*
    if (isLoggedIn() === false) {
      // Discord login flow...
    }
    */
    
    // Initialize auth state from our custom auth service
    // Auth service doesn't need explicit initialization

    const settingsModal = document.querySelector(
      "user-setting",
    ) as UserSettingModal;
    settingsModal instanceof UserSettingModal;
    document
      .getElementById("settings-button")
      ?.addEventListener("click", () => {
        settingsModal.open();
      });

    const hostModal = document.querySelector(
      "host-lobby-modal",
    ) as HostPrivateLobbyModal;
    hostModal instanceof HostPrivateLobbyModal;
    const hostLobbyButton = document.getElementById("host-lobby-button");
    if (hostLobbyButton === null) throw new Error("Missing host-lobby-button");
    hostLobbyButton.addEventListener("click", async () => {
      const partySystem = document.querySelector('party-system') as PartySystem;
      if (partySystem?.isInPartyAsNonHost()) {
        // Don't allow non-host party members to access this
        return;
      }
      if (this.usernameInput?.isValid()) {
        // Check if user is logged in and needs to accept terms
        const user = await authService.getCurrentUser();
        if (user) {
          await checkTermsAcceptance(() => {
            hostModal.open();
            this.publicLobby.leaveLobby();
          });
        } else {
          hostModal.open();
          this.publicLobby.leaveLobby();
        }
      }
    });

    this.joinModal = document.querySelector(
      "join-private-lobby-modal",
    ) as JoinPrivateLobbyModal;
    this.joinModal instanceof JoinPrivateLobbyModal;
    const joinPrivateLobbyButton = document.getElementById(
      "join-private-lobby-button",
    );
    if (joinPrivateLobbyButton === null)
      throw new Error("Missing join-private-lobby-button");
    joinPrivateLobbyButton.addEventListener("click", async () => {
      const partySystem = document.querySelector('party-system') as PartySystem;
      if (partySystem?.isInPartyAsNonHost()) {
        // Don't allow non-host party members to access this
        return;
      }
      if (this.usernameInput?.isValid()) {
        // Check if user is logged in and needs to accept terms
        const user = await authService.getCurrentUser();
        if (user) {
          await checkTermsAcceptance(() => {
            this.joinModal.open();
          });
        } else {
          this.joinModal.open();
        }
      }
    });

    if (this.userSettings.darkMode()) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    page("/join/:lobbyId", (ctx) => {
      if (ctx.init && sessionStorage.getItem("inLobby")) {
        // On page reload, go back home
        page("/");
        return;
      }
      const lobbyId = ctx.params.lobbyId;

      this.joinModal.open(lobbyId);

      console.log(`joining lobby ${lobbyId}`);
    });

    page();
    function updateSliderProgress(slider) {
      const percent =
        ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.setProperty("--progress", `${percent}%`);
    }

    document
      .querySelectorAll("#bots-count, #private-lobby-bots-count")
      .forEach((slider) => {
        updateSliderProgress(slider);
        slider.addEventListener("input", () => updateSliderProgress(slider));
      });
  }

  private async handleJoinLobby(event: CustomEvent) {
    const lobby = event.detail as JoinLobbyEvent;
    console.log(`joining lobby ${lobby.gameID}`);
    
    // Dispatch join-game event for party system
    window.dispatchEvent(new CustomEvent("join-game", {
      detail: { gameID: lobby.gameID },
      bubbles: true,
      composed: true
    }));
    
    // Check if this is from party system or if we need to bring party members
    const partySystem = document.querySelector('party-system') as any;
    if (partySystem && partySystem.isInParty && partySystem.isHost()) {
      // If host is joining, notify party system to bring members
      partySystem.hostJoiningGame(lobby);
    }
    
    if (this.gameStop !== null) {
      console.log("joining lobby, stopping existing game");
      this.gameStop();
    }
    const config = await getServerConfigFromClient();

    this.gameStop = joinLobby(
      {
        gameID: lobby.gameID,
        serverConfig: config,
        flag:
          this.flagInput === null || this.flagInput.getCurrentFlag() === "xx"
            ? ""
            : this.flagInput.getCurrentFlag(),
        playerName: this.usernameInput?.getCurrentUsername() ?? "",
        token: getPlayToken(),
        clientID: lobby.clientID,
        gameStartInfo: lobby.gameStartInfo ?? lobby.gameRecord?.info,
        gameRecord: lobby.gameRecord,
        partyId: lobby.partyId || (partySystem?.getPartyInfo ? partySystem.getPartyInfo().partyId : undefined),
      },
      () => {
        console.log("Closing modals and hiding main menu");
        // Add in-game class to body
        document.body.classList.add("in-game");
        
        // Dispatch game-started event for party system
        window.dispatchEvent(new CustomEvent("game-started", {
          detail: { gameID: lobby.gameID },
          bubbles: true,
          composed: true
        }));
        
        // Hide the main menu header and footer when game starts
        const header = document.querySelector(".l-header") as HTMLElement;
        const footer = document.querySelector(".l-footer") as HTMLElement;
        const mainContainer = document.querySelector("main") as HTMLElement;
        
        if (header) header.style.display = "none";
        if (footer) footer.style.display = "none";
        if (mainContainer) mainContainer.style.display = "none";
        
        document.getElementById("settings-button")?.classList.add("hidden");
        document
          .getElementById("username-validation-error")
          ?.classList.add("hidden");
        [
          "single-player-modal",
          "host-lobby-modal",
          "join-private-lobby-modal",
          "game-starting-modal",
          "top-bar",
          "help-modal",
          "user-setting",
        ].forEach((tag) => {
          const modal = document.querySelector(tag) as HTMLElement & {
            close?: () => void;
            isModalOpen?: boolean;
          };
          if (modal?.close) {
            modal.close();
          } else if ("isModalOpen" in modal) {
            modal.isModalOpen = false;
          }
        });
        this.publicLobby.stop();
        document.querySelectorAll(".ad").forEach((ad) => {
          (ad as HTMLElement).style.display = "none";
        });

        // show when the game loads
        const startingModal = document.querySelector(
          "game-starting-modal",
        ) as GameStartingModal;
        startingModal instanceof GameStartingModal;
        startingModal.show();
      },
      () => {
        this.joinModal.close();
        this.publicLobby.stop();
        document.querySelectorAll(".ad").forEach((ad) => {
          (ad as HTMLElement).style.display = "none";
        });

        // For multiplayer games, update the URL
        if (!lobby.gameStartInfo || lobby.gameStartInfo.config?.gameType !== GameType.Singleplayer) {
          window.history.pushState({}, "", `/join/${lobby.gameID}`);
          sessionStorage.setItem("inLobby", "true");
        }
      },
    );
  }

  private async handleLeaveLobby(/* event: CustomEvent */) {
    if (this.gameStop === null) {
      return;
    }
    console.log("leaving lobby, cancelling game");
    
    // Remove in-game class
    document.body.classList.remove("in-game");
    
    // Reset all game UI
    UIManager.resetGameUI();
    
    // Restore UI
    const header = document.querySelector(".l-header") as HTMLElement;
    const footer = document.querySelector(".l-footer") as HTMLElement;
    const mainContainer = document.querySelector("main") as HTMLElement;
    const settingsButton = document.getElementById("settings-button");
    
    if (header) header.style.display = "";
    if (footer) footer.style.display = "";
    if (mainContainer) mainContainer.style.display = "";
    if (settingsButton) settingsButton.classList.remove("hidden");
    
    this.gameStop();
    this.gameStop = null;
    this.publicLobby.leaveLobby();
    
    // Restart the public lobby fetching
    this.publicLobby.connectedCallback();
    
    // Clear the URL if we're in a game
    if (window.location.pathname.startsWith('/join/')) {
      window.history.pushState({}, "", "/");
      sessionStorage.removeItem("inLobby");
    }
  }
  
  private setupPartySystemObserver(): void {
    // Check party status periodically and update UI
    const checkPartyStatus = () => {
      // Don't show party controls if we're in a game
      const inGame = document.body.classList.contains('in-game');
      if (inGame) {
        const overlay = document.getElementById('party-host-control-overlay');
        if (overlay) {
          overlay.style.display = 'none';
          overlay.classList.add('hidden');
        }
        return;
      }
      
      const partySystem = document.querySelector('party-system') as PartySystem;
      const overlay = document.getElementById('party-host-control-overlay');
      
      if (partySystem && overlay) {
        const isNonHost = partySystem.isInPartyAsNonHost();
        
        // Show/hide overlay
        if (isNonHost) {
          overlay.style.display = 'block';
          overlay.classList.remove('hidden');
          
          // Disable menu buttons
          const menuButtons = [
            'single-player',
            'host-lobby-button',
            'join-private-lobby-button'
          ];
          
          menuButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
              btn.style.opacity = '0.5';
              btn.style.cursor = 'not-allowed';
            }
          });
          
          // Also prevent clicking on public lobbies
          const publicLobby = document.querySelector('public-lobby') as PublicLobby;
          if (publicLobby) {
            publicLobby.style.pointerEvents = 'none';
            publicLobby.style.opacity = '0.7';
          }
        } else {
          overlay.style.display = 'none';
          overlay.classList.add('hidden');
          
          // Re-enable menu buttons
          const menuButtons = [
            'single-player',
            'host-lobby-button',
            'join-private-lobby-button'
          ];
          
          menuButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
            }
          });
          
          // Re-enable public lobbies
          const publicLobby = document.querySelector('public-lobby') as PublicLobby;
          if (publicLobby) {
            publicLobby.style.pointerEvents = 'auto';
            publicLobby.style.opacity = '1';
          }
        }
      }
    };
    
    // Check immediately and then every 500ms
    checkPartyStatus();
    setInterval(checkPartyStatus, 500);
  }
  
  private async checkAuthStatus(): Promise<void> {
    const isAuthenticated = await authService.isAuthenticated();
    if (isAuthenticated) {
      const user = await authService.getCurrentUser();
      console.log('User authenticated:', user?.username);
    }
  }
}

// Initialize the client when the DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize translation manager first
  await translationManager.initialize();
  
  // Small delay to ensure all components are ready
  setTimeout(() => {
    // Force update all o-button elements to re-render with translations
    document.querySelectorAll('o-button').forEach(button => {
      if ('requestUpdate' in button && typeof button.requestUpdate === 'function') {
        (button as any).requestUpdate();
      }
    });
    
    // Also update public lobby component
    const publicLobby = document.querySelector('public-lobby');
    if (publicLobby && 'requestUpdate' in publicLobby && typeof publicLobby.requestUpdate === 'function') {
      (publicLobby as any).requestUpdate();
    }
  }, 100);
  
  // Then initialize the client
  await new Client().initialize();
});

// Enable Hot Module Replacement (HMR)
if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.accept();
  
  // Handle HMR updates for specific modules
  (module as any).hot.accept('./styles.css', () => {
    console.log('CSS updated via HMR');
  });
  
  // Force reload when HTML changes
  (module as any).hot.accept('./index.html', () => {
    console.log('HTML updated, reloading page...');
    window.location.reload();
  });
  
  // Log HMR status
  console.log('🔥 HMR is enabled and watching files');
}

function setFavicon(): void {
  const link = document.createElement("link");
  link.type = "image/x-icon";
  link.rel = "shortcut icon";
  link.href = favicon;
  document.head.appendChild(link);
}

// WARNING: DO NOT EXPOSE THIS ID
function getPlayToken(): string {
  // Fall back to Discord JWT first
  const result = isLoggedIn();
  if (result !== false) return result.token;
  
  // For all other cases (guests, development, etc.), use UUID
  // The TokenSchema in LocalServer accepts either a UUID or JWT
  return getPersistentIDFromCookie();
}

// WARNING: DO NOT EXPOSE THIS ID
export async function getPersistentID(): Promise<string> {
  // First try custom auth user ID
  const user = await authService.getCurrentUser();
  if (user?.id) return user.id;
  
  // Fall back to Discord JWT
  const result = isLoggedIn();
  if (result !== false) return result.claims.sub;
  
  // Finally fall back to cookie
  return getPersistentIDFromCookie();
}

// WARNING: DO NOT EXPOSE THIS ID
function getPersistentIDFromCookie(): string {
  const COOKIE_NAME = "player_persistent_id";

  // Try to get existing cookie
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=").map((c) => c.trim());
    if (cookieName === COOKIE_NAME) {
      return cookieValue;
    }
  }

  // If no cookie exists, create new ID and set cookie
  const newID = generateCryptoRandomUUID();
  document.cookie = [
    `${COOKIE_NAME}=${newID}`,
    `max-age=${5 * 365 * 24 * 60 * 60}`, // 5 years
    "path=/",
    "SameSite=Strict",
    "Secure",
  ].join(";");

  return newID;
}
