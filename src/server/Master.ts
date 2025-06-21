import cluster from "cluster";
import express from "express";
import rateLimit from "express-rate-limit";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { GameMode } from "../core/game/Game";
import { GameInfo } from "../core/Schemas";
import { generateID } from "../core/Util";
import { gatekeeper, LimiterType } from "./Gatekeeper";
import { logger } from "./Logger";
import { MapPlaylist } from "./MapPlaylist";
import { PartyManager } from "./PartyManager";

const config = getServerConfigFromServer();
const playlist = new MapPlaylist();
const readyWorkers = new Set();
const masterPartyManager = new PartyManager(logger.child({ comp: "party" }));

const app = express();
const server = http.createServer(app);

const log = logger.child({ comp: "m" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.json());
app.use(
  express.static(path.join(__dirname, "../../static"), {
    maxAge: "1y", // Set max-age to 1 year for all static assets
    setHeaders: (res, path) => {
      // You can conditionally set different cache times based on file types
      if (path.endsWith(".html")) {
        // Set HTML files to no-cache to ensure Express doesn't send 304s
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        // Prevent conditional requests
        res.setHeader("ETag", "");
      } else if (path.match(/\.(js|css|svg)$/)) {
        // JS, CSS, SVG get long cache with immutable
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (path.match(/\.(bin|dat|exe|dll|so|dylib)$/)) {
        // Binary files also get long cache with immutable
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
      // Other file types use the default maxAge setting
    },
  }),
);
app.use(express.json());

app.set("trust proxy", 3);
app.use(
  rateLimit({
    windowMs: 1000, // 1 second
    max: 20, // 20 requests per IP per second
  }),
);

let publicLobbiesJsonStr = JSON.stringify({ lobbies: [] }); // Initialize with empty array

const publicLobbyIDs: Set<string> = new Set();

// Start the master process
export async function startMaster() {
  if (!cluster.isPrimary) {
    throw new Error(
      "startMaster() should only be called in the primary process",
    );
  }

  log.info(`Primary ${process.pid} is running`);
  log.info(`Setting up ${config.numWorkers()} workers...`);

  // Fork workers
  for (let i = 0; i < config.numWorkers(); i++) {
    const worker = cluster.fork({
      WORKER_ID: i,
    });

    log.info(`Started worker ${i} (PID: ${worker.process.pid})`);
  }

  cluster.on("message", (worker, message) => {
    if (message.type === "WORKER_READY") {
      const workerId = message.workerId;
      readyWorkers.add(workerId);
      log.info(
        `Worker ${workerId} is ready. (${readyWorkers.size}/${config.numWorkers()} ready)`,
      );
      // Start scheduling when all workers are ready
      if (readyWorkers.size === config.numWorkers()) {
        log.info("All workers ready, starting game scheduling");

        const scheduleLobbies = () => {
          schedulePublicGame(playlist).catch((error) => {
            log.error("Error scheduling public game:", error);
          });
        };

        // Initially create 2 lobbies: first FFA, then Team
        schedulePublicGame(playlist, GameMode.FFA).catch((error) => {
          log.error("Error scheduling FFA game:", error);
        });
        setTimeout(() => {
          schedulePublicGame(playlist, GameMode.Team).catch((error) => {
            log.error("Error scheduling Team game:", error);
          });
        }, 2000); // Create Team lobby after 2 seconds
        
        // Initial fetch after creating lobbies
        setTimeout(() => fetchLobbies(), 3000);

        // Check every 2 seconds to maintain 2 active lobbies
        setInterval(
          async () => {
            await fetchLobbies(); // This updates the public lobbies cache
            
            const lobbies = await fetchLobbiesDetailed();
            
            // Count all active lobbies
            const activeLobbies = lobbies.length;
            
            // Always maintain at least 3 lobbies (buffer)
            const desiredLobbies = 3;
            const minimumLobbies = 2; // What we show to users
            
            // Count lobbies by type
            const ffaCount = lobbies.filter(l => l.gameConfig?.gameMode === GameMode.FFA).length;
            const teamCount = lobbies.filter(l => l.gameConfig?.gameMode === GameMode.Team).length;
            
            // Check if any lobby is about to start (less than 10 seconds)
            const lobbyAboutToStart = lobbies.some(l => {
              const msUntilStart = l.msUntilStart ?? Infinity;
              return msUntilStart < 10000; // 10 seconds
            });
            
            const lobbiesToCreate = Math.max(0, desiredLobbies - activeLobbies);
            
            // Always create a new lobby if one is about to start
            if (lobbyAboutToStart || lobbiesToCreate > 0) {
              const actualToCreate = Math.max(1, lobbiesToCreate);
              log.info(`Active lobbies: ${activeLobbies}, creating ${actualToCreate} more (lobby about to start: ${lobbyAboutToStart})`);
              
              for (let i = 0; i < actualToCreate; i++) {
                // Try to maintain balance between FFA and Team
                let mode: GameMode;
                if (ffaCount === 0) {
                  mode = GameMode.FFA;
                } else if (teamCount === 0) {
                  mode = GameMode.Team;
                } else {
                  mode = ffaCount <= teamCount ? GameMode.FFA : GameMode.Team;
                }
                
                // Create immediately, no delay
                schedulePublicGame(playlist, mode).catch((error) => {
                  log.error(`Error scheduling ${mode} game:`, error);
                });
              }
            }
          },
          2000, // Check every 2 seconds for faster response
        );
      }
    }
  });

  // Handle worker crashes
  cluster.on("exit", (worker, code, signal) => {
    const workerId = (worker as any).process?.env?.WORKER_ID;
    if (!workerId) {
      log.error(`worker crashed could not find id`);
      return;
    }

    log.warn(
      `Worker ${workerId} (PID: ${worker.process.pid}) died with code: ${code} and signal: ${signal}`,
    );
    log.info(`Restarting worker ${workerId}...`);

    // Restart the worker with the same ID
    const newWorker = cluster.fork({
      WORKER_ID: workerId,
    });

    log.info(
      `Restarted worker ${workerId} (New PID: ${newWorker.process.pid})`,
    );
  });

  const PORT = 3000;
  const HOST = process.env.SERVER_HOST || '0.0.0.0'; // Bind to all interfaces by default
  server.listen(PORT, HOST, () => {
    log.info(`Master HTTP server listening on ${HOST}:${PORT}`);
  });
}

app.get(
  "/api/env",
  gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
    const envConfig = {
      game_env: process.env.GAME_ENV || "prod",
    };
    res.json(envConfig);
  }),
);

// Add lobbies endpoint to list public games for this worker
app.get(
  "/api/public_lobbies",
  gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
    res.send(publicLobbiesJsonStr);
  }),
);

app.post(
  "/api/kick_player/:gameID/:clientID",
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    if (req.headers[config.adminHeader()] !== config.adminToken()) {
      res.status(401).send("Unauthorized");
      return;
    }

    const { gameID, clientID } = req.params;

    try {
      const response = await fetch(
        `http://localhost:${config.workerPort(gameID)}/api/kick_player/${gameID}/${clientID}`,
        {
          method: "POST",
          headers: {
            [config.adminHeader()]: config.adminToken(),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to kick player: ${response.statusText}`);
      }

      res.status(200).send("Player kicked successfully");
    } catch (error) {
      log.error(`Error kicking player from game ${gameID}:`, error);
      res.status(500).send("Failed to kick player");
    }
  }),
);

// Party API endpoints for cross-worker coordination
app.post(
  "/api/party/create",
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    const { hostId, hostClientId, hostName, hostFlag } = req.body;
    
    if (!hostId || !hostClientId || !hostName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const partyCode = masterPartyManager.createParty(hostId, hostClientId, hostName, hostFlag);
    const party = masterPartyManager.getPartyByCode(partyCode);
    
    res.json({
      success: true,
      partyCode,
      party: {
        id: party?.id,
        members: party ? Array.from(party.members.values()) : [],
        hostId: party?.hostId
      }
    });
  }),
);

app.post(
  "/api/party/join/:partyCode",
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    const { partyCode } = req.params;
    const { memberId, memberClientId, memberName, memberFlag } = req.body;
    
    if (!memberId || !memberClientId || !memberName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const party = masterPartyManager.joinParty(partyCode, memberId, memberClientId, memberName, memberFlag);
    
    if (!party) {
      return res.status(404).json({ error: "Party not found or full" });
    }

    res.json({
      success: true,
      party: {
        id: party.id,
        members: Array.from(party.members.values()),
        hostId: party.hostId
      }
    });
  }),
);

app.get(
  "/api/party/:partyCode",
  gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
    const { partyCode } = req.params;
    const party = masterPartyManager.getPartyByCode(partyCode);
    
    if (!party) {
      return res.status(404).json({ error: "Party not found" });
    }

    res.json({
      id: party.id,
      members: Array.from(party.members.values()),
      hostId: party.hostId,
      inGame: party.inGame,
      memberGames: party.memberGames ? Array.from(party.memberGames.entries()) : [],
      gameId: party.gameId,
      workerIndex: party.workerIndex,
      hostActivity: party.hostActivity,
      hostSelectedLobby: party.hostSelectedLobby
    });
  }),
);

app.post(
  "/api/party/start/:partyCode",
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    const { partyCode } = req.params;
    const { hostId, gameId } = req.body;
    
    const party = masterPartyManager.getPartyByCode(partyCode);
    if (!party || party.hostId !== hostId) {
      return res.status(403).json({ error: "Only host can start game" });
    }

    // Use the provided gameId (from an existing lobby) instead of generating a new one
    const gameID = gameId;
    
    if (!gameID) {
      return res.status(400).json({ error: "Game ID is required" });
    }
    
    // Verify the game exists on the appropriate worker
    const workerPort = config.workerPort(gameID);
    
    try {
      // Check if game exists
      const checkResponse = await fetch(
        `http://localhost:${workerPort}/api/game/${gameID}`,
        {
          method: "GET",
          headers: {
            [config.adminHeader()]: config.adminToken(),
          },
        },
      );

      if (!checkResponse.ok) {
        throw new Error(`Game ${gameID} not found on worker`);
      }

      const workerIndex = config.workerIndex(gameID);
      masterPartyManager.setPartyInGame(party.id, gameID, workerIndex);
      
      res.json({
        success: true,
        gameId: gameID,
        workerIndex: workerIndex,
        workerUrl: `w${workerIndex}`
      });
    } catch (error) {
      log.error(`Failed to set party game:`, error);
      res.status(500).json({ error: "Failed to set party game" });
    }
  }),
);

app.post(
  "/api/party/leave/:memberId",
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    const { memberId } = req.params;
    
    const party = masterPartyManager.leaveParty(memberId);
    
    res.json({
      success: true,
      party: party ? {
        id: party.id,
        members: Array.from(party.members.values()),
        hostId: party.hostId
      } : null
    });
  }),
);

app.post(
  "/api/party/activity/:partyCode",
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    const { partyCode } = req.params;
    const { hostId, activity, selectedLobby } = req.body;
    
    const success = masterPartyManager.updateHostActivity(
      partyCode,
      hostId,
      activity,
      selectedLobby
    );
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(403).json({ error: "Not authorized or party not found" });
    }
  }),
);

app.post(
  "/api/party/status/:partyCode",
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    const { partyCode } = req.params;
    const { memberId, inGame, isConnected } = req.body;
    
    const party = masterPartyManager.updateMemberStatus(memberId, isConnected, inGame);
    
    if (party) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Party or member not found" });
    }
  }),
);

app.post(
  "/api/party/game/:partyCode",
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    const { partyCode } = req.params;
    const { memberId, gameId } = req.body;
    
    masterPartyManager.setMemberInGame(memberId, gameId);
    
    res.json({ success: true });
  }),
);

async function fetchLobbiesDetailed(): Promise<GameInfo[]> {
  const fetchPromises: Promise<GameInfo | null>[] = [];
  
  log.info(`Fetching details for ${publicLobbyIDs.size} public lobbies`);

  for (const gameID of new Set(publicLobbyIDs)) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000); // 5 second timeout
    const port = config.workerPort(gameID);
    const url = `http://localhost:${port}/api/game/${gameID}`;
    
    log.debug(`Fetching game ${gameID} from ${url}`);
    
    const promise = fetch(url, {
      headers: { [config.adminHeader()]: config.adminToken() },
      signal: controller.signal,
    })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        return resp.json();
      })
      .then((json) => {
        log.debug(`Successfully fetched game ${gameID}:`, JSON.stringify(json).substring(0, 200));
        return json as GameInfo;
      })
      .catch((error) => {
        log.error(`Error fetching game ${gameID} from port ${port}:`, error.message);
        // Return null or a placeholder if fetch fails
        publicLobbyIDs.delete(gameID);
        return null;
      });

    fetchPromises.push(promise);
  }

  // Wait for all promises to resolve
  const results = await Promise.all(fetchPromises);

  // Filter out any null results from failed fetches
  const lobbyInfos: GameInfo[] = results
    .filter((result) => result !== null)
    .map((gi: GameInfo) => {
      // msUntilStart from GameServer is an absolute timestamp, we need to convert to relative
      const msUntilStart = gi.msUntilStart ? gi.msUntilStart - Date.now() : 0;
      return {
        gameID: gi.gameID,
        numClients: gi?.clients?.length ?? 0,
        gameConfig: gi.gameConfig,
        msUntilStart: msUntilStart,
      } as GameInfo;
    });

  // Remove lobbies that are about to start or are full
  lobbyInfos.forEach((l) => {
    if (l.msUntilStart !== undefined && l.msUntilStart <= 250) {
      publicLobbyIDs.delete(l.gameID);
    }
    
    if (l.gameConfig && l.gameConfig.maxPlayers && l.numClients !== undefined && l.numClients >= l.gameConfig.maxPlayers) {
      publicLobbyIDs.delete(l.gameID);
    }
  });

  // Sort lobbies to ensure FFA comes first (left), then Team (right)
  lobbyInfos.sort((a, b) => {
    const aMode = a.gameConfig?.gameMode ?? GameMode.FFA;
    const bMode = b.gameConfig?.gameMode ?? GameMode.FFA;
    
    // FFA (0) should come before Team (1)
    if (aMode === GameMode.FFA && bMode === GameMode.Team) return -1;
    if (aMode === GameMode.Team && bMode === GameMode.FFA) return 1;
    
    // If same mode, sort by time remaining (more time first)
    return (b.msUntilStart ?? 0) - (a.msUntilStart ?? 0);
  });

  return lobbyInfos;
}

async function fetchLobbies(): Promise<number> {
  const lobbies = await fetchLobbiesDetailed();
  
  // Update the JSON string
  publicLobbiesJsonStr = JSON.stringify({
    lobbies: lobbies,
  });
  
  log.info(`Updated public lobbies: ${lobbies.length} lobbies, JSON: ${publicLobbiesJsonStr.substring(0, 200)}`);
  
  return publicLobbyIDs.size;
}

// Function to schedule a new public game
async function schedulePublicGame(playlist: MapPlaylist, preferredMode?: GameMode) {
  const gameID = generateID();
  publicLobbyIDs.add(gameID);

  const workerIndex = config.workerIndex(gameID);
  const workerPort = config.workerPort(gameID);
  const gameConfig = playlist.gameConfig(preferredMode);
  
  log.info(`Creating new public lobby ${gameID} on worker ${workerIndex} (port ${workerPort}) with map ${gameConfig.gameMap}, mode ${gameConfig.gameMode === GameMode.FFA ? 'FFA' : 'Team'}`);
  log.debug(`Game config:`, JSON.stringify(gameConfig));

  // Send request to the worker to start the game
  try {
    const url = `http://localhost:${workerPort}/api/create_game/${gameID}`;
    log.debug(`Sending request to ${url}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [config.adminHeader()]: config.adminToken(),
      },
      body: JSON.stringify(gameConfig),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to schedule public game: ${response.status} ${response.statusText} - ${text}`);
    }

    const data = await response.json();
    log.info(`Successfully created public lobby ${gameID}, response:`, JSON.stringify(data).substring(0, 200));
    
    // Immediately fetch to verify
    setTimeout(async () => {
      const lobbies = await fetchLobbies();
      log.info(`After creating ${gameID}, we now have ${lobbies} public lobbies`);
    }, 1000);
  } catch (error) {
    log.error(`Failed to schedule public game on worker ${workerIndex} (port ${workerPort}):`, error);
    publicLobbyIDs.delete(gameID);
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// SPA fallback route
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "../../static/index.html"));
});
