import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import http from "http";
import ipAnonymize from "ip-anonymize";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod/v4";
import { GameEnv } from "../core/configuration/Config";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { GameType } from "../core/game/Game";
import {
  ClientJoinMessageSchema,
  ClientMessageSchema,
  ClientPartyMessage,
  GameRecord,
  GameRecordSchema,
  ServerPartyMessage,
} from "../core/Schemas";
import { CreateGameInputSchema, GameInputSchema } from "../core/WorkerSchemas";
import { archive, readGameRecord } from "./Archive";
import { Client } from "./Client";
import { GameManager } from "./GameManager";
import { gatekeeper, LimiterType } from "./Gatekeeper";
import { getUserMe, verifyClientToken } from "./jwt";
import { logger } from "./Logger";
import { PartyManager } from "./PartyManager";
import { initWorkerMetrics } from "./WorkerMetrics";

const config = getServerConfigFromServer();

const workerId = parseInt(process.env.WORKER_ID || "0");
const log = logger.child({ comp: `w_${workerId}` });

// Worker setup
export function startWorker() {
  log.info(`Worker starting...`);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  const gm = new GameManager(config, log);
  const pm = new PartyManager(log);
  
  // Track WebSocket connections for party members
  const partyConnections = new Map<string, WebSocket>(); // memberId -> WebSocket

  if (config.env() === GameEnv.Prod && config.otelEnabled()) {
    initWorkerMetrics(gm);
  }

  // Middleware to handle /wX path prefix
  app.use((req, res, next) => {
    // Extract the original path without the worker prefix
    const originalPath = req.url;
    const match = originalPath.match(/^\/w(\d+)(.*)$/);

    if (match) {
      const pathWorkerId = parseInt(match[1]);
      const actualPath = match[2] || "/";

      // Verify this request is for the correct worker
      if (pathWorkerId !== workerId) {
        return res.status(404).json({
          error: "Worker mismatch",
          message: `This is worker ${workerId}, but you requested worker ${pathWorkerId}`,
        });
      }

      // Update the URL to remove the worker prefix
      req.url = actualPath;
    }

    next();
  });

  app.set("trust proxy", 3);
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../../out")));
  app.use(
    rateLimit({
      windowMs: 1000, // 1 second
      max: 20, // 20 requests per IP per second
    }),
  );

  app.post(
    "/api/create_game/:id",
    gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
      const id = req.params.id;
      if (!id) {
        log.warn(`cannot create game, id not found`);
        return res.status(400).json({ error: "Game ID is required" });
      }
      const clientIP = req.ip || req.socket.remoteAddress || "unknown";
      const result = CreateGameInputSchema.safeParse(req.body);
      if (!result.success) {
        const error = z.prettifyError(result.error);
        return res.status(400).json({ error });
      }

      const gc = result.data;
      if (
        gc?.gameType === GameType.Public &&
        req.headers[config.adminHeader()] !== config.adminToken()
      ) {
        log.warn(
          `cannot create public game ${id}, ip ${ipAnonymize(clientIP)} incorrect admin token`,
        );
        return res.status(401).send("Unauthorized");
      }

      // Double-check this worker should host this game
      const expectedWorkerId = config.workerIndex(id);
      if (expectedWorkerId !== workerId) {
        log.warn(
          `This game ${id} should be on worker ${expectedWorkerId}, but this is worker ${workerId}`,
        );
        return res.status(400).json({ error: "Worker, game id mismatch" });
      }

      const game = gm.createGame(id, gc);

      log.info(
        `Worker ${workerId}: IP ${ipAnonymize(clientIP)} creating game ${game.isPublic() ? "Public" : "Private"} with id ${id}`,
      );
      res.json(game.gameInfo());
    }),
  );

  // Add other endpoints from your original server
  app.post(
    "/api/start_game/:id",
    gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
      log.info(`starting private lobby with id ${req.params.id}`);
      const game = gm.game(req.params.id);
      if (!game) {
        return;
      }
      if (game.isPublic()) {
        const clientIP = req.ip || req.socket.remoteAddress || "unknown";
        log.info(
          `cannot start public game ${game.id}, game is public, ip: ${ipAnonymize(clientIP)}`,
        );
        return;
      }
      game.start();
      res.status(200).json({ success: true });
    }),
  );

  app.put(
    "/api/game/:id",
    gatekeeper.httpHandler(LimiterType.Put, async (req, res) => {
      const result = GameInputSchema.safeParse(req.body);
      if (!result.success) {
        const error = z.prettifyError(result.error);
        return res.status(400).json({ error });
      }
      const config = result.data;
      // TODO: only update public game if from local host
      const lobbyID = req.params.id;
      if (config.gameType === GameType.Public) {
        log.info(`cannot update game ${lobbyID} to public`);
        return res.status(400).json({ error: "Cannot update public game" });
      }
      const game = gm.game(lobbyID);
      if (!game) {
        return res.status(400).json({ error: "Game not found" });
      }
      if (game.isPublic()) {
        const clientIP = req.ip || req.socket.remoteAddress || "unknown";
        log.warn(
          `cannot update public game ${game.id}, ip: ${ipAnonymize(clientIP)}`,
        );
        return res.status(400).json({ error: "Cannot update public game" });
      }
      if (game.hasStarted()) {
        log.warn(`cannot update game ${game.id} after it has started`);
        return res
          .status(400)
          .json({ error: "Cannot update game after it has started" });
      }
      game.updateGameConfig(config);
      res.status(200).json({ success: true });
    }),
  );

  app.get(
    "/api/game/:id/exists",
    gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
      const lobbyId = req.params.id;
      res.json({
        exists: gm.game(lobbyId) !== null,
      });
    }),
  );

  app.get(
    "/api/game/:id",
    gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
      const game = gm.game(req.params.id);
      if (game === null) {
        log.info(`lobby ${req.params.id} not found`);
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game.gameInfo());
    }),
  );

  app.get(
    "/api/archived_game/:id",
    gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
      const gameRecord = await readGameRecord(req.params.id);

      if (!gameRecord) {
        return res.status(404).json({
          success: false,
          error: "Game not found",
          exists: false,
        });
      }

      if (
        config.env() !== GameEnv.Dev &&
        gameRecord.gitCommit !== config.gitCommit()
      ) {
        log.warn(
          `git commit mismatch for game ${req.params.id}, expected ${config.gitCommit()}, got ${gameRecord.gitCommit}`,
        );
        return res.status(409).json({
          success: false,
          error: "Version mismatch",
          exists: true,
          details: {
            expectedCommit: config.gitCommit(),
            actualCommit: gameRecord.gitCommit,
          },
        });
      }

      return res.status(200).json({
        success: true,
        exists: true,
        gameRecord: gameRecord,
      });
    }),
  );

  app.post(
    "/api/archive_singleplayer_game",
    gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
      const result = GameRecordSchema.safeParse(req.body);
      if (!result.success) {
        const error = z.prettifyError(result.error);
        log.info(error);
        return res.status(400).json({ error });
      }

      const gameRecord: GameRecord = result.data;
      archive(gameRecord);
      res.json({
        success: true,
      });
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

      const game = gm.game(gameID);
      if (!game) {
        res.status(404).send("Game not found");
        return;
      }

      game.kickClient(clientID);
      res.status(200).send("Player kicked successfully");
    }),
  );

  // Party endpoints - forward to master for cross-worker coordination
  app.post(
    "/api/party/create",
    gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/party/create`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body),
          }
        );
        
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        log.error("Error creating party:", error);
        res.status(500).json({ error: "Failed to create party" });
      }
    }),
  );

  app.post(
    "/api/party/join/:partyCode",
    gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
      const { partyCode } = req.params;
      
      try {
        const response = await fetch(
          `http://localhost:3000/api/party/join/${partyCode}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body),
          }
        );
        
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        log.error("Error joining party:", error);
        res.status(500).json({ error: "Failed to join party" });
      }
    }),
  );

  app.get(
    "/api/party/:partyCode",
    gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
      const { partyCode } = req.params;
      
      try {
        const response = await fetch(
          `http://localhost:3000/api/party/${partyCode}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        log.error("Error getting party:", error);
        res.status(500).json({ error: "Failed to get party info" });
      }
    }),
  );

  app.post(
    "/api/party/status/:partyCode",
    gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
      const { partyCode } = req.params;
      const { memberId, inGame, isConnected } = req.body;
      
      try {
        const response = await fetch(
          `http://localhost:3000/api/party/status/${partyCode}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ memberId, inGame, isConnected })
          }
        );
        
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        log.error("Error updating member status:", error);
        res.status(500).json({ error: "Failed to update member status" });
      }
    }),
  );

  app.post(
    "/api/party/game/:partyCode",
    gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
      const { partyCode } = req.params;
      const { memberId, gameId } = req.body;
      
      try {
        const response = await fetch(
          `http://localhost:3000/api/party/game/${partyCode}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ memberId, gameId })
          }
        );
        
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        log.error("Error updating member game status:", error);
        res.status(500).json({ error: "Failed to update member game status" });
      }
    }),
  );

  // WebSocket handling
  wss.on("connection", (ws: WebSocket, req) => {
    // Store client metadata for party connections
    let connectedClient: { clientId?: string; partyId?: string } = {};

    ws.on(
      "message",
      gatekeeper.wsHandler(req, async (message: string) => {
        const forwarded = req.headers["x-forwarded-for"];
        const ip = Array.isArray(forwarded)
          ? forwarded[0]
          : forwarded || req.socket.remoteAddress || "unknown";

        try {
          // First parse the JSON
          const jsonMessage = JSON.parse(message.toString());
          
          // Handle different message types based on the type field
          if (jsonMessage.type === "join") {
            // Handle join message specially (has token field)
            const parsed = ClientJoinMessageSchema.safeParse(jsonMessage);
            if (!parsed.success) {
              const error = z.prettifyError(parsed.error);
              log.warn("Error parsing join message", error);
              ws.close();
              return;
            }
            
            const clientMsg = parsed.data;
            
            // Verify this worker should handle this game
            const expectedWorkerId = config.workerIndex(clientMsg.gameID);
            if (expectedWorkerId !== workerId) {
              log.warn(
                `Worker mismatch: Game ${clientMsg.gameID} should be on worker ${expectedWorkerId}, but this is worker ${workerId}`,
              );
              return;
            }

            const { persistentId, claims } = await verifyClientToken(
              clientMsg.token,
              config,
            );

            let roles: string[] | undefined;

            // Check user roles
            if (claims !== null) {
              const result = await getUserMe(clientMsg.token, config);
              if (result === false) {
                log.warn("Token is not valid", claims);
                return;
              }
              roles = result.player.roles;
            }

            // Create client and add to game
            const partyId = clientMsg.partyId || connectedClient.partyId;
            log.info(`Creating client ${clientMsg.username} with partyId: ${partyId}`);
            const client = new Client(
              clientMsg.clientID,
              persistentId,
              claims,
              roles,
              ip,
              clientMsg.username,
              ws,
              clientMsg.flag,
              partyId,
            );

            const wasFound = gm.addClient(
              client,
              clientMsg.gameID,
              clientMsg.lastTurn,
            );

            if (!wasFound) {
              log.info(
                `game ${clientMsg.gameID} not found on worker ${workerId}`,
              );
            }
          } else if (jsonMessage.type === "party") {
            // Handle party messages
            const partyMsg = jsonMessage as ClientPartyMessage;
              
              switch (partyMsg.action) {
                case "create": {
                  if (!partyMsg.memberId || !partyMsg.memberName) {
                    ws.send(JSON.stringify({
                      type: "party",
                      action: "create",
                      error: "Missing required fields"
                    } as ServerPartyMessage));
                    return;
                  }

                  try {
                    // Call master API to create party
                    const response = await fetch("http://localhost:3000/api/party/create", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        hostId: partyMsg.memberId,
                        hostClientId: partyMsg.memberId,
                        hostName: partyMsg.memberName,
                        hostFlag: partyMsg.memberFlag || ""
                      }),
                    });

                    const data = await response.json();
                    
                    if (response.ok && data.party) {
                      connectedClient.clientId = partyMsg.memberId;
                      connectedClient.partyId = data.party.id;
                      
                      // Track this WebSocket connection
                      partyConnections.set(partyMsg.memberId, ws);

                      ws.send(JSON.stringify({
                        type: "party",
                        action: "create",
                        partyCode: data.partyCode,
                        partyId: data.party.id,
                        members: data.party.members,
                        hostId: data.party.hostId
                      } as ServerPartyMessage));
                    } else {
                      ws.send(JSON.stringify({
                        type: "party",
                        action: "create",
                        error: data.error || "Failed to create party"
                      } as ServerPartyMessage));
                    }
                  } catch (error) {
                    log.error("Error creating party:", error);
                    ws.send(JSON.stringify({
                      type: "party",
                      action: "create",
                      error: "Failed to create party"
                    } as ServerPartyMessage));
                  }
                  break;
                }

                case "join": {
                  if (!partyMsg.partyCode || !partyMsg.memberId || !partyMsg.memberName) {
                    ws.send(JSON.stringify({
                      type: "party",
                      action: "join",
                      error: "Missing required fields"
                    } as ServerPartyMessage));
                    return;
                  }

                  try {
                    // Call master API to join party
                    const response = await fetch(`http://localhost:3000/api/party/join/${partyMsg.partyCode}`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        memberId: partyMsg.memberId,
                        memberClientId: partyMsg.memberId,
                        memberName: partyMsg.memberName,
                        memberFlag: partyMsg.memberFlag || ""
                      }),
                    });

                    const data = await response.json();
                    
                    if (response.ok && data.party) {
                      connectedClient.clientId = partyMsg.memberId;
                      connectedClient.partyId = data.party.id;
                      
                      // Track this WebSocket connection
                      partyConnections.set(partyMsg.memberId, ws);
                      
                      // Get fresh party data to broadcast
                      const partyResponse = await fetch(`http://localhost:3000/api/party/${partyMsg.partyCode}`);
                      const partyData = await partyResponse.json();

                      // Send update to all party members across workers
                      await broadcastToPartyAcrossWorkers(partyData, {
                        type: "party",
                        action: "update",
                        partyId: partyData.id,
                        members: partyData.members,
                        hostId: partyData.hostId
                      } as ServerPartyMessage);
                    } else {
                      ws.send(JSON.stringify({
                        type: "party",
                        action: "join",
                        error: data.error || "Failed to join party"
                      } as ServerPartyMessage));
                    }
                  } catch (error) {
                    log.error("Error joining party:", error);
                    ws.send(JSON.stringify({
                      type: "party",
                      action: "join",
                      error: "Failed to join party"
                    } as ServerPartyMessage));
                  }
                  break;
                }

                case "leave": {
                  if (!partyMsg.memberId) {
                    return;
                  }

                  try {
                    // Call master API to leave party
                    const response = await fetch(`http://localhost:3000/api/party/leave/${partyMsg.memberId}`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });

                    const data = await response.json();
                    
                    connectedClient.partyId = undefined;
                    
                    // Remove from connection tracking
                    partyConnections.delete(partyMsg.memberId);
                    
                    if (data.party) {
                      // Get fresh party data to broadcast
                      const partyCode = partyMsg.partyCode;
                      if (partyCode) {
                        const partyResponse = await fetch(`http://localhost:3000/api/party/${partyCode}`);
                        const partyData = await partyResponse.json();
                        
                        // Send update to remaining party members
                        await broadcastToPartyAcrossWorkers(partyData, {
                          type: "party",
                          action: "update",
                          partyId: partyData.id,
                          members: partyData.members,
                          hostId: partyData.hostId
                        } as ServerPartyMessage);
                      }
                    }

                    ws.send(JSON.stringify({
                      type: "party",
                      action: "leave"
                    } as ServerPartyMessage));
                  } catch (error) {
                    log.error("Error leaving party:", error);
                    ws.send(JSON.stringify({
                      type: "party",
                      action: "leave",
                      error: "Failed to leave party"
                    } as ServerPartyMessage));
                  }
                  break;
                }

                case "update": {
                  // Handle reconnection updates
                  if (partyMsg.memberId && partyMsg.partyCode) {
                    connectedClient.clientId = partyMsg.memberId;
                    
                    // Re-establish connection tracking
                    partyConnections.set(partyMsg.memberId, ws);
                    
                    // Get fresh party data
                    try {
                      const response = await fetch(`http://localhost:3000/api/party/${partyMsg.partyCode}`);
                      if (response.ok) {
                        const partyData = await response.json();
                        connectedClient.partyId = partyData.id;
                        
                        ws.send(JSON.stringify({
                          type: "party",
                          action: "update",
                          partyId: partyData.id,
                          members: partyData.members,
                          hostId: partyData.hostId
                        } as ServerPartyMessage));
                      }
                    } catch (error) {
                      log.error("Error updating party connection:", error);
                    }
                  }
                  break;
                }

                case "start_game": {
                  if (!partyMsg.memberId || !partyMsg.partyCode) {
                    ws.send(JSON.stringify({
                      type: "party",
                      action: "start_game",
                      error: "Missing party code"
                    } as ServerPartyMessage));
                    return;
                  }

                  try {
                    // Call master API to start party game
                    const response = await fetch(`http://localhost:3000/api/party/start/${partyMsg.partyCode}`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        hostId: partyMsg.memberId
                      }),
                    });

                    const data = await response.json();
                    
                    if (response.ok && data.gameId) {
                      // Get fresh party data
                      const partyResponse = await fetch(`http://localhost:3000/api/party/${partyMsg.partyCode}`);
                      const partyData = await partyResponse.json();

                      // Notify all party members to join the game
                      await broadcastToPartyAcrossWorkers(partyData, {
                        type: "party",
                        action: "start_game",
                        gameId: data.gameId
                      } as ServerPartyMessage);
                    } else {
                      ws.send(JSON.stringify({
                        type: "party",
                        action: "start_game",
                        error: data.error || "Failed to start game"
                      } as ServerPartyMessage));
                    }
                  } catch (error) {
                    log.error("Error starting party game:", error);
                    ws.send(JSON.stringify({
                      type: "party",
                      action: "start_game",
                      error: "Failed to start game"
                    } as ServerPartyMessage));
                  }
                  break;
                }
              }
          } else {
            // Handle other message types if needed
            // Parse with general schema for other message types
            const parsed = ClientMessageSchema.safeParse(jsonMessage);
            if (parsed.success) {
              // Pass to game manager for game-specific messages
              log.debug(`Received message type: ${jsonMessage.type}`);
            } else {
              log.warn(`Unknown message type: ${jsonMessage.type}`);
            }
          }
        } catch (error) {
          log.warn(
            `error handling websocket message for ${ipAnonymize(ip)}: ${error}`.substring(
              0,
              250,
            ),
          );
        }
      }),
    );

    ws.on("close", () => {
      // Handle disconnection - update party member status
      if (connectedClient.clientId && connectedClient.partyId) {
        // Remove from connection tracking
        partyConnections.delete(connectedClient.clientId);
        
        const party = pm.updateMemberStatus(connectedClient.clientId, false);
        if (party) {
          // Notify other party members
          broadcastToParty(party.id, {
            type: "party",
            action: "update",
            partyId: party.id,
            members: Array.from(party.members.values()),
            hostId: party.hostId
          } as ServerPartyMessage);
        }
      }
    });

    ws.on("error", (error: Error) => {
      if ((error as any).code === "WS_ERR_UNEXPECTED_RSV_1") {
        ws.close(1002);
      }
    });
  });

  // Helper function to broadcast messages to all party members on this worker
  function broadcastToParty(partyId: string, message: ServerPartyMessage) {
    const party = pm.getParty(partyId);
    if (!party) return;

    const messageStr = JSON.stringify(message);
    
    // Send to all party members who have active connections on this worker
    party.members.forEach((member) => {
      const ws = partyConnections.get(member.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  // Helper function to broadcast messages to all party members across all workers
  async function broadcastToPartyAcrossWorkers(party: any, message: ServerPartyMessage) {
    const messageStr = JSON.stringify(message);
    
    // First, send to all members connected to this worker
    party.members.forEach((member: any) => {
      const ws = partyConnections.get(member.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
    
    // For cross-worker communication, we'd need to implement a message bus
    // or use Redis pub/sub. For now, this is a simplified version that only
    // handles connections on the same worker.
    // TODO: Implement cross-worker messaging via Redis or similar
  }

  // The load balancer will handle routing to this server based on path
  const PORT = config.workerPortByIndex(workerId);
  const HOST = process.env.SERVER_HOST || '0.0.0.0'; // Bind to all interfaces by default
  server.listen(PORT, HOST, () => {
    log.info(`running on http://${HOST}:${PORT}`);
    log.info(`Handling requests with path prefix /w${workerId}/`);
    // Signal to the master process that this worker is ready
    if (process.send) {
      process.send({
        type: "WORKER_READY",
        workerId: workerId,
      });
      log.info(`signaled ready state to master`);
    }
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    log.error(`Error in ${req.method} ${req.path}:`, err);
    res.status(500).json({ error: "An unexpected error occurred" });
  });

  // Process-level error handlers
  process.on("uncaughtException", (err) => {
    log.error(`uncaught exception:`, err);
  });

  process.on("unhandledRejection", (reason, promise) => {
    log.error(`unhandled rejection at:`, promise, "reason:", reason);
  });
}
