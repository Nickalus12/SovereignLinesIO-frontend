import { GameServer } from "../GameServer";
import { Client } from "../Client";
import { SecurityManager } from "./SecurityManager";
import { Game, Player } from "../../core/game/Game";
import { Intent } from "../../core/Schemas";
import { logger } from "../Logger";
import type { Logger } from "winston";

/**
 * Integrates security features into the GameServer
 * This modifies the GameServer to add security validation
 */
export function integrateSecurityIntoGameServer(
  gameServer: GameServer,
  game: Game,
  logger: Logger
): SecurityManager {
  const securityManager = new SecurityManager(game, {
    enableAntiCheat: true,
    enableServerValidation: true,
    enableReplayProtection: true,
    autobanThreshold: 5,
    shadowBanEnabled: true,
    logSecurityEvents: true,
  });

  // Override the addIntent method to add security validation
  const originalAddIntent = (gameServer as any).addIntent;
  (gameServer as any).addIntent = async function(intent: Intent) {
    // Find the client who sent this intent
    const client = gameServer.activeClients.find(c => c.clientID === intent.clientID);
    if (!client) {
      logger.warn("Intent from unknown client", { clientID: intent.clientID });
      return;
    }

    // Check if this intent type needs validation
    const needsValidation = [
      "spawn", "attack", "build_unit", "boat", 
      "donate_gold", "donate_troops", "troop_ratio"
    ].includes(intent.type);
    
    if (!needsValidation) {
      // Some intents don't need validation (like emoji, alliance requests, etc)
      return originalAddIntent.call(gameServer, intent);
    }

    // Extract nonce if present
    const nonce = (intent as any).nonce;

    // Validate the intent
    const validation = await securityManager.validateClientIntent(
      client,
      intent,
      nonce
    );

    if (!validation.allowed) {
      logger.warn("Security validation failed", {
        clientID: client.clientID,
        intentType: intent.type,
        reason: validation.reason,
      });

      // Send error to client
      if (client.ws.readyState === 1) { // WebSocket.OPEN
        client.ws.send(JSON.stringify({
          type: "error",
          error: validation.reason || "Action not allowed",
          code: "SECURITY_VALIDATION_FAILED",
        }));
      }

      // Don't process the intent
      return;
    }

    // If shadow banned, pretend to accept but don't actually add
    if (securityManager.isBanned(client.persistentID)) {
      logger.debug("Shadow banned player intent ignored", {
        clientID: client.clientID,
        intentType: intent.type,
      });
      return;
    }

    // Validation passed, proceed with original logic
    return originalAddIntent.call(gameServer, intent);
  }.bind(gameServer);

  // Add security event listeners
  securityManager.on("security:event", (event) => {
    if (event.type === "player_banned") {
      // Find and disconnect the player
      const client = gameServer.activeClients.find(
        c => c.persistentID === event.playerId
      );
      if (client) {
        gameServer.kickClient(client.clientID);
      }
    }
  });

  // Add admin endpoints
  setupAdminEndpoints(gameServer, securityManager, logger);

  return securityManager;
}


/**
 * Setup admin endpoints for security management
 */
function setupAdminEndpoints(
  gameServer: GameServer,
  securityManager: SecurityManager,
  logger: Logger
) {
  // These would be added to your Express routes
  // Example implementation:
  
  // Get security report
  (gameServer as any).getSecurityReport = () => {
    return securityManager.getSecurityReport();
  };

  // Unban player
  (gameServer as any).unbanPlayer = (playerId: string) => {
    const success = securityManager.unbanPlayer(playerId);
    if (success) {
      logger.info("Player unbanned via admin", { playerId });
    }
    return success;
  };

  // Clear violations
  (gameServer as any).clearViolations = (playerId: string) => {
    securityManager.clearViolations(playerId);
    logger.info("Violations cleared via admin", { playerId });
  };

  // Get player security details
  (gameServer as any).getPlayerSecurityDetails = (playerId: string) => {
    return {
      violations: securityManager.getViolations(playerId),
      isBanned: securityManager.isBanned(playerId),
    };
  };
}

/**
 * Create a secure game server with all security features enabled
 */
export function createSecureGameServer(
  id: string,
  log: Logger,
  createdAt: number,
  config: any,
  gameConfig: any,
  game: Game
): GameServer {
  const gameServer = new GameServer(
    id,
    log,
    createdAt,
    config,
    gameConfig
  );

  // Integrate security
  const securityManager = integrateSecurityIntoGameServer(gameServer, game, log);

  // Add security manager reference
  (gameServer as any).securityManager = securityManager;

  return gameServer;
}