// This is a manual test to verify SAM placement restrictions
// Run this to see console output showing the validation

import { SpawnExecution } from "../src/core/execution/SpawnExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../src/core/game/Game";
import { setup } from "./util/Setup";

async function testSAMPlacement() {
  const game = await setup("BigPlains", { infiniteGold: true, instantBuild: true });
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

  const defender = game.player("defender_id");
  
  // Expand territory
  for (let x = 40; x <= 80; x++) {
    for (let y = 40; y <= 60; y++) {
      if (game.map().isLand(game.ref(x, y))) {
        game.map().setOwnerID(game.ref(x, y), defender.smallID());
      }
    }
  }

  console.log("\n=== Testing SAM Placement Restrictions ===");
  
  // Test 1: Can build first SAM
  const firstLocation = game.ref(50, 50);
  const canBuildFirst = defender.canBuild(UnitType.SAMLauncher, firstLocation);
  console.log(`Can build SAM at (50,50): ${canBuildFirst !== false}`);
  
  if (canBuildFirst !== false) {
    const firstSAM = defender.buildUnit(UnitType.SAMLauncher, canBuildFirst, {});
    console.log(`Built first SAM at: (${game.x(firstSAM.tile())}, ${game.y(firstSAM.tile())})`);
    
    // Test 2: Try to build too close
    const tooCloseLocation = game.ref(60, 50); // 10 tiles away
    const canBuildTooClose = defender.canBuild(UnitType.SAMLauncher, tooCloseLocation);
    console.log(`Can build SAM at (60,50) - 10 tiles away: ${canBuildTooClose !== false}`);
    
    // Test 3: Try to build at proper distance
    const farLocation = game.ref(80, 50); // 30 tiles away
    const canBuildFar = defender.canBuild(UnitType.SAMLauncher, farLocation);
    console.log(`Can build SAM at (80,50) - 30 tiles away: ${canBuildFar !== false}`);
    
    // Test 4: Check buildableUnits
    console.log("\n=== Testing buildableUnits ===");
    const buildableAt60 = defender.buildableUnits(game.ref(60, 50));
    const samBuildable60 = buildableAt60.find(u => u.type === UnitType.SAMLauncher);
    console.log(`buildableUnits at (60,50) - SAM canBuild: ${samBuildable60?.canBuild !== false}`);
    
    const buildableAt80 = defender.buildableUnits(game.ref(80, 50));
    const samBuildable80 = buildableAt80.find(u => u.type === UnitType.SAMLauncher);
    console.log(`buildableUnits at (80,50) - SAM canBuild: ${samBuildable80?.canBuild !== false}`);
  }
  
  console.log("\nTest complete!");
}

testSAMPlacement().catch(console.error);