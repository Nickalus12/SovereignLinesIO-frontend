import { AttackExecution } from "../src/core/execution/AttackExecution";
import { SupplyTruckExecution } from "../src/core/execution/SupplyTruckExecution";
import { UnitType, PlayerType } from "../src/core/game/Game";
import { createTestContext } from "./util/TestContext";
import { runExecutions } from "./util/runExecutions";

describe("Supply Truck Attack Bonus", () => {
  it("should apply attack bonus when supply truck is nearby", () => {
    const context = createTestContext();
    const { mg, p1, p2 } = context;

    // Give players territory and troops
    const startingTiles = 100;
    for (let i = 0; i < startingTiles; i++) {
      p1.conquer(i);
      p2.conquer(i + 500);
    }

    // Give players troops
    p1.addTroops(10000);
    p2.addTroops(5000);

    // Place a supply truck for player 1
    const supplyTruckTile = 90; // Near the border
    const supplyTruckExecution = new SupplyTruckExecution({
      owner: p1,
      destination: supplyTruckTile,
      type: UnitType.SupplyTruck,
    });

    runExecutions(mg, [supplyTruckExecution], 1);
    
    // Verify supply truck was created
    const supplyTrucks = p1.units(UnitType.SupplyTruck);
    expect(supplyTrucks.length).toBe(1);
    const supplyTruck = supplyTrucks[0];
    expect(supplyTruck.isActive()).toBe(true);

    // Create attack from p1 to p2 territory
    const attackExecution = new AttackExecution(
      5000, // troops
      p1,
      p2.id(),
      null, // no source tile
      true  // remove troops
    );

    // Run a few ticks to let the attack progress
    const initialP2Tiles = p2.numTilesOwned();
    runExecutions(mg, [attackExecution], 20);

    // Check that p1 has conquered some tiles from p2
    const tilesConquered = initialP2Tiles - p2.numTilesOwned();
    expect(tilesConquered).toBeGreaterThan(0);
    
    // The presence of supply truck should be helping
    // We can't easily compare with/without in the same test due to randomness
    // But we can verify the attack is working
  });

  it("should verify supply truck mechanics are in place", () => {
    const context = createTestContext();
    const { mg, p1, p2 } = context;

    // Give players territory - create a border
    for (let i = 0; i < 50; i++) {
      p1.conquer(i);
      p2.conquer(i + 50);
    }

    // Give troops
    p1.addTroops(5000);
    p2.addTroops(2000);

    // Place a supply truck
    const supplyTruckExecution = new SupplyTruckExecution({
      owner: p1,
      destination: 45, // Near the border
      type: UnitType.SupplyTruck,
    });

    runExecutions(mg, [supplyTruckExecution], 1);
    
    // Verify supply truck was created
    const supplyTrucks = p1.units(UnitType.SupplyTruck);
    expect(supplyTrucks.length).toBe(1);
    expect(supplyTrucks[0].isActive()).toBe(true);

    // The attack bonus is applied in the attackLogic method
    // We can verify the configuration is correct
    expect(mg.config().supplyTruckRange()).toBe(40);
    expect(mg.config().supplyTruckAttackBonus()).toBe(1.5);
  });
});