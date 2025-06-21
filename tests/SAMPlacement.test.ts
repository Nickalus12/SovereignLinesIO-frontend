import { SAMLauncherExecution } from "../src/core/execution/SAMLauncherExecution";
import { SpawnExecution } from "../src/core/execution/SpawnExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../src/core/game/Game";
import { setup } from "./util/Setup";
import { constructionExecution } from "./util/utils";

let game: Game;
let defender: Player;

describe("SAM Placement and Upgrades", () => {
  beforeEach(async () => {
    game = await setup("BigPlains", { infiniteGold: true, instantBuild: true });
    const defender_info = new PlayerInfo(
      "us",
      "defender_id",
      PlayerType.Human,
      null,
      "defender_id",
    );
    game.addPlayer(defender_info);

    game.addExecution(
      new SpawnExecution(game.player(defender_info.id).info(), game.ref(50, 50)),
    );

    while (game.inSpawnPhase()) {
      game.executeNextTick();
    }

    defender = game.player("defender_id");
  });
  
  test("SAMs cannot be placed too close to each other", () => {
    // First, expand the player's territory to ensure we own the tiles we're testing
    for (let x = 40; x <= 80; x++) {
      for (let y = 40; y <= 60; y++) {
        if (game.map().isLand(game.ref(x, y))) {
          game.map().setOwnerID(game.ref(x, y), defender.smallID());
        }
      }
    }
    
    // Build first SAM at spawn location
    const firstLocation = game.ref(50, 50);
    constructionExecution(game, defender, 50, 50, UnitType.SAMLauncher);
    const firstSAM = defender.units(UnitType.SAMLauncher)[0];
    expect(firstSAM).toBeDefined();
    
    // Try to build second SAM too close (10 tiles away, less than samMinDist of 25)
    const canBuildTooClose = defender.canBuild(UnitType.SAMLauncher, game.ref(60, 50));
    expect(canBuildTooClose).toBe(false);
    
    // Try to build second SAM at proper distance (30 tiles away, > 25)
    const canBuildFar = defender.canBuild(UnitType.SAMLauncher, game.ref(80, 50));
    expect(canBuildFar).not.toBe(false);
  });
  
  test("SAM missile count increases based on level thresholds", () => {
    // Build SAM
    const sam = defender.buildUnit(UnitType.SAMLauncher, game.ref(50, 50), {
      cooldownDuration: 75,
      readyMissileCount: game.config().samMissilesPerLevel(1),
    });
    
    // Level 1 SAM should have 1 missile
    expect(sam.level()).toBe(1);
    expect((sam as any)._readyMissileCount).toBe(1);
    
    // Upgrade to level 2 - should still have 1 missile
    sam.increaseLevel();
    expect(sam.level()).toBe(2);
    expect((sam as any)._readyMissileCount).toBe(1);
    
    // Upgrade to level 3 - should now have 2 missiles
    sam.increaseLevel();
    expect(sam.level()).toBe(3);
    expect((sam as any)._readyMissileCount).toBe(2);
    
    // Upgrade to level 4 - should still have 2 missiles
    sam.increaseLevel();
    expect(sam.level()).toBe(4);
    expect((sam as any)._readyMissileCount).toBe(2);
  });
  
  test("SAM minimum distance is configurable", () => {
    const config = game.config();
    expect(config.samMinDist()).toBe(25);
    expect(config.samMissilesPerLevel(1)).toBe(1);
    expect(config.samMissilesPerLevel(2)).toBe(1);
    expect(config.samMissilesPerLevel(3)).toBe(2);
    expect(config.samMissilesPerLevel(4)).toBe(2);
  });
});