import { AttackExecution } from "../src/core/execution/AttackExecution";
import { ConstructionExecution } from "../src/core/execution/ConstructionExecution";
import { SupplyTruckExecution } from "../src/core/execution/SupplyTruckExecution";
import { SpawnExecution } from "../src/core/execution/SpawnExecution";
import { 
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType 
} from "../src/core/game/Game";
import { setup } from "./util/Setup";
import { constructionExecution, executeTicks } from "./util/utils";

describe("Supply Truck", () => {
  let game: Game;
  let player1: Player;
  let player2: Player;

  beforeEach(async () => {
    game = await setup("Plains", {
      infiniteGold: true,
      instantBuild: true,
    });
    
    const player1Info = new PlayerInfo(
      "us",
      "player1",
      PlayerType.Human,
      null,
      "player1_id",
    );
    game.addPlayer(player1Info);
    
    const player2Info = new PlayerInfo(
      "us", 
      "player2",
      PlayerType.Human,
      null,
      "player2_id",
    );
    game.addPlayer(player2Info);
    
    player1 = game.player("player1_id");
    player2 = game.player("player2_id");
    
    // Spawn players
    game.addExecution(new SpawnExecution(player1Info, game.ref(10, 10)));
    game.addExecution(new SpawnExecution(player2Info, game.ref(30, 30)));
    executeTicks(game, 5);
    
    // Check if players spawned properly
    console.log("Player1 tiles:", player1.numTilesOwned());
    console.log("Player2 tiles:", player2.numTilesOwned());
    console.log("In spawn phase:", game.inSpawnPhase());
    console.log("Game ticks:", game.ticks());
    
    // End spawn phase if needed
    if (game.inSpawnPhase()) {
      executeTicks(game, 305); // Run past spawn phase
    }
  });

  it("should be buildable through construction", async () => {
    player1.addGold(1000000n);
    
    // Make sure player owns the tile
    player1.conquer(game.ref(10, 10));
    player1.conquer(game.ref(11, 10));
    player1.conquer(game.ref(9, 10));
    player1.conquer(game.ref(10, 11));
    player1.conquer(game.ref(10, 9));
    
    const tile = game.ref(10, 10);
    
    // Check if player can build at this location
    const canBuild = player1.canBuild(UnitType.SupplyTruck, tile);
    console.log("Can build supply truck:", canBuild);
    
    const construction = new ConstructionExecution(player1, tile, UnitType.SupplyTruck);
    game.addExecution(construction);
    
    // Wait for construction to complete  
    executeTicks(game, 10);
    
    // Check for construction units first
    const constructionUnits = player1.units(UnitType.Construction);
    console.log("Construction units:", constructionUnits.length);
    
    const supplyTrucks = player1.units(UnitType.SupplyTruck);
    console.log("Supply trucks:", supplyTrucks.length);
    console.log("All units:", player1.units().map(u => u.type()));
    expect(supplyTrucks.length).toBe(1);
  });

  it("should provide attack bonus to nearby friendly units", async () => {
    // Expand territories
    for (let x = 5; x < 20; x++) {
      for (let y = 5; y < 20; y++) {
        player1.conquer(game.ref(x, y));
      }
    }
    for (let x = 20; x < 35; x++) {
      for (let y = 20; y < 35; y++) {
        player2.conquer(game.ref(x, y));  
      }
    }
    
    player1.addGold(1000000n);
    player1.addTroops(10000);
    player2.addTroops(5000);
    
    // Build a supply truck for player1 near the border
    const supplyTruckTile = game.ref(18, 18);
    const supplyTruck = player1.buildUnit(UnitType.SupplyTruck, supplyTruckTile, {
      deployedAt: game.ticks(),
      suppliesRemaining: 1000,
    });
    
    // Store initial state
    const initialP1Tiles = player1.numTilesOwned();
    const initialP1Troops = player1.troops();
    const initialP2Troops = player2.troops();
    
    // Create an attack
    const attackExecution = new AttackExecution(5000, player1, player2.id(), null, true);
    game.addExecution(attackExecution);
    
    // Run attack for several ticks
    executeTicks(game, 50);
    
    // With supply truck bonus, player1 should have gained territory
    const p1TilesAfter = player1.numTilesOwned();
    expect(p1TilesAfter).toBeGreaterThan(initialP1Tiles);
    
    // Supply truck should still be active
    expect(supplyTruck.isActive()).toBe(true);
  });

  it("should deplete supplies over time and be destroyed when empty", async () => {
    player1.addGold(1000000n);
    const tile = game.ref(10, 10);
    
    // Build supply truck with short supply duration for testing
    const supplyTruck = player1.buildUnit(UnitType.SupplyTruck, tile, {
      deployedAt: game.ticks(),
      suppliesRemaining: 10, // Only 10 ticks of supplies
    });
    
    const execution = new SupplyTruckExecution(supplyTruck);
    game.addExecution(execution);
    
    // Supply truck should be active initially
    expect(supplyTruck.isActive()).toBe(true);
    
    // Wait for supplies to deplete
    executeTicks(game, 15);
    
    // Supply truck should be destroyed
    expect(supplyTruck.isActive()).toBe(false);
  });

  it("should move to destination before deploying", async () => {
    player1.addGold(1000000n);
    
    // Create a path of owned tiles
    for (let x = 5; x < 25; x++) {
      player1.conquer(game.ref(x, 10));
    }
    
    const destinationTile = game.ref(20, 10);
    
    // Build supply truck with destination
    const execution = new SupplyTruckExecution({
      owner: player1,
      destination: destinationTile,
    });
    game.addExecution(execution);
    
    // Wait for initialization
    executeTicks(game, 1);
    
    const supplyTrucks = player1.units(UnitType.SupplyTruck);
    expect(supplyTrucks.length).toBe(1);
    
    const supplyTruck = supplyTrucks[0];
    const initialTile = supplyTruck.tile();
    
    // Wait for movement
    executeTicks(game, 30);
    
    // Supply truck should have moved closer to destination
    const finalTile = supplyTruck.tile();
    const initialDist = game.manhattanDist(initialTile, destinationTile);
    const finalDist = game.manhattanDist(finalTile, destinationTile);
    
    expect(finalDist).toBeLessThan(initialDist);
  });

  it("should not provide bonus to enemy units", async () => {
    // Expand territories  
    for (let x = 5; x < 20; x++) {
      for (let y = 5; y < 20; y++) {
        player1.conquer(game.ref(x, y));
      }
    }
    for (let x = 20; x < 35; x++) {
      for (let y = 20; y < 35; y++) {
        player2.conquer(game.ref(x, y));
      }
    }
    
    player1.addGold(1000000n);
    player2.addGold(1000000n);
    player1.addTroops(5000);
    player2.addTroops(10000);
    
    // Build a supply truck for player1
    const supplyTruckTile = game.ref(18, 18);
    player1.buildUnit(UnitType.SupplyTruck, supplyTruckTile, {
      deployedAt: game.ticks(),
      suppliesRemaining: 1000,
    });
    
    // Store initial state
    const initialP2Tiles = player2.numTilesOwned();
    
    // Player2 attacks - should NOT get supply truck bonus
    const attackExecution = new AttackExecution(5000, player2, player1.id(), null, true);
    game.addExecution(attackExecution);
    
    // Wait for attack
    executeTicks(game, 50);
    
    // Player2 should gain territory normally (no supply truck bonus)
    const p2TilesAfter = player2.numTilesOwned();
    expect(p2TilesAfter).toBeGreaterThan(initialP2Tiles);
  });

  it("should scale cost based on number of existing supply trucks", async () => {
    // Create a new game without infiniteGold for testing costs
    const costTestGame = await setup("Plains", {
      instantBuild: true,
    });
    
    const testPlayer = new PlayerInfo(
      "us",
      "testPlayer",
      PlayerType.Human,
      null,
      "test_player_id",
    );
    costTestGame.addPlayer(testPlayer);
    const player = costTestGame.player("test_player_id");
    
    // Spawn player
    costTestGame.addExecution(new SpawnExecution(testPlayer, costTestGame.ref(10, 10)));
    executeTicks(costTestGame, 5);
    
    player.addGold(10000000n);
    
    // Create owned tiles
    for (let i = 0; i < 5; i++) {
      player.conquer(costTestGame.ref(10 + i, 10));
    }
    
    const unitInfo = costTestGame.unitInfo(UnitType.SupplyTruck);
    
    // First supply truck costs 100,000
    const cost1 = unitInfo.cost(player);
    expect(cost1).toBe(100000n);
    
    // Build first supply truck
    player.buildUnit(UnitType.SupplyTruck, costTestGame.ref(10, 10), {});
    
    // Second supply truck costs 200,000
    const cost2 = unitInfo.cost(player);
    expect(cost2).toBe(200000n);
    
    // Build second supply truck
    player.buildUnit(UnitType.SupplyTruck, costTestGame.ref(11, 10), {});
    
    // Third supply truck costs 300,000
    const cost3 = unitInfo.cost(player);
    expect(cost3).toBe(300000n);
  });
});