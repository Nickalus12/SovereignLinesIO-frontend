import { Execution, Game, Player, UnitType } from "../game/Game";
import { PseudoRandom } from "../PseudoRandom";
import { simpleHash } from "../Util";
import { BotBehavior } from "./utils/BotBehavior";

export class BotExecution implements Execution {
  private active = true;
  private random: PseudoRandom;
  private mg: Game;
  private neighborsTerraNullius = true;

  private behavior: BotBehavior | null = null;
  private attackRate: number;
  private attackTick: number;
  private triggerRatio: number;
  private reserveRatio: number;
  private lastAllianceEvaluation = 0;

  constructor(private bot: Player) {
    this.random = new PseudoRandom(simpleHash(bot.id()));
    this.attackRate = this.random.nextInt(40, 80);
    this.attackTick = this.random.nextInt(0, this.attackRate);
    this.triggerRatio = this.random.nextInt(60, 90) / 100;
    this.reserveRatio = this.random.nextInt(30, 60) / 100;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  init(mg: Game) {
    this.mg = mg;
    this.bot.setTargetTroopRatio(0.7);
  }

  tick(ticks: number) {
    // Dynamic attack rate - attack more frequently in late game
    const dynamicAttackRate = this.getDynamicAttackRate();
    if (ticks % dynamicAttackRate !== this.attackTick % dynamicAttackRate) return;

    if (!this.bot.isAlive()) {
      this.active = false;
      return;
    }

    if (this.behavior === null) {
      this.behavior = new BotBehavior(
        this.random,
        this.mg,
        this.bot,
        this.triggerRatio,
        this.reserveRatio,
      );
    }

    this.behavior.handleAllianceRequests();
    
    // Evaluate existing alliances less frequently in late game
    const allianceCheckInterval = this.mg.ticks() > 5000 ? 150 : 50;
    if (ticks - this.lastAllianceEvaluation > allianceCheckInterval) {
      this.lastAllianceEvaluation = ticks;
      this.behavior.evaluateExistingAlliances();
    }
    
    this.maybeAttack();
    this.maybeUseNukes();
    this.maybeBuildStructures();
    this.maybeUseTransportShips();
  }

  private getDynamicAttackRate(): number {
    // Check if we're in late game
    const players = this.mg.players().filter(p => p.isAlive());
    const totalLandTiles = this.mg.numLandTiles();
    
    // Check if any player owns a significant portion of the map
    for (const player of players) {
      const ownershipRatio = player.numTilesOwned() / totalLandTiles;
      if (ownershipRatio > 0.5) {
        // Attack much more frequently in late game
        return Math.max(10, Math.floor(this.attackRate / 4));
      }
    }
    
    // Attack more frequently if few players left
    if (players.length <= 3) {
      return Math.max(15, Math.floor(this.attackRate / 3));
    }
    
    // Attack more frequently if game has been going on for long
    if (this.mg.ticks() > 10000) {
      return Math.max(20, Math.floor(this.attackRate / 2));
    }
    
    return this.attackRate;
  }

  private maybeUseNukes() {
    // Only use nukes if we have enough gold and it makes strategic sense
    const silos = this.bot.units(UnitType.MissileSilo);
    
    // Build missile silos if we don't have any and have gold
    if (silos.length === 0 && this.bot.gold() >= 2_000_000n) {
      this.buildMissileSilo();
      return;
    }

    // Launch nukes if we have silos and targets
    for (const silo of silos) {
      if (silo.isInCooldown()) continue;
      
      const targetPlayer = this.selectNukeTarget();
      if (!targetPlayer) continue;
      
      // Decide which type of nuke to use based on gold
      if (this.bot.gold() >= 25_000_000n && this.random.chance(3)) {
        // Use MIRV if we have lots of gold
        this.launchMIRV(silo, targetPlayer);
      } else if (this.bot.gold() >= 5_000_000n && this.random.chance(2)) {
        // Use Hydrogen Bomb
        this.launchHydrogenBomb(silo, targetPlayer);
      } else if (this.bot.gold() >= 750_000n) {
        // Use Atom Bomb
        this.launchAtomBomb(silo, targetPlayer);
      }
    }
  }

  private buildMissileSilo() {
    // Find a good location for missile silo
    const tiles = Array.from(this.bot.tiles());
    const centerTiles = tiles.filter(tile => {
      // Don't build on border tiles
      if (this.bot.borderTiles().has(tile)) return false;
      
      // Check if we can build here
      const canBuild = this.bot.canBuild(UnitType.MissileSilo, tile);
      return canBuild !== false;
    });
    
    if (centerTiles.length === 0) return;
    
    // Pick a random suitable tile
    const targetTile = this.random.randElement(centerTiles);
    const buildTile = this.bot.canBuild(UnitType.MissileSilo, targetTile);
    
    if (buildTile !== false) {
      this.bot.buildUnit(UnitType.MissileSilo, buildTile, {});
    }
  }

  private selectNukeTarget(): Player | null {
    // Target the biggest threat
    const enemies = this.mg.players()
      .filter(p => p.isAlive() && p !== this.bot && !this.bot.isFriendly(p))
      .sort((a, b) => b.numTilesOwned() - a.numTilesOwned());
    
    if (enemies.length === 0) return null;
    
    // In late game, always target the leader
    if (this.isLateGame()) {
      return enemies[0];
    }
    
    // Otherwise, pick from top enemies
    const topEnemies = enemies.slice(0, 3);
    return this.random.randElement(topEnemies);
  }

  private launchAtomBomb(silo: any, target: Player) {
    // Find a good target tile - aim for dense areas
    const targetTiles = Array.from(target.tiles());
    if (targetTiles.length === 0) return;
    
    // Pick a central tile of the target
    const targetTile = this.findDenseTargetTile(targetTiles);
    
    silo.launch();
    this.bot.buildUnit(UnitType.AtomBomb, silo.tile(), {
      targetTile: targetTile
    });
  }

  private launchHydrogenBomb(silo: any, target: Player) {
    const targetTiles = Array.from(target.tiles());
    if (targetTiles.length === 0) return;
    
    const targetTile = this.findDenseTargetTile(targetTiles);
    
    silo.launch();
    this.bot.buildUnit(UnitType.HydrogenBomb, silo.tile(), {
      targetTile: targetTile
    });
  }

  private launchMIRV(silo: any, target: Player) {
    const targetTiles = Array.from(target.tiles());
    if (targetTiles.length === 0) return;
    
    // MIRV can hit multiple targets, so pick a central area
    const targetTile = this.findDenseTargetTile(targetTiles);
    
    silo.launch();
    this.bot.buildUnit(UnitType.MIRV, silo.tile(), {});
  }

  private findDenseTargetTile(tiles: number[]): number {
    // Try to find a tile that's not on the edge (more central)
    const centerTiles = tiles.filter(tile => {
      // Check if tile has many neighbors owned by same player
      let neighborCount = 0;
      const neighbors = this.mg.neighbors(tile);
      for (const neighbor of neighbors) {
        if (tiles.includes(neighbor)) neighborCount++;
      }
      return neighborCount >= 4; // Tile surrounded by other owned tiles
    });
    
    if (centerTiles.length > 0) {
      return this.random.randElement(centerTiles);
    }
    
    // Fallback to any tile
    return this.random.randElement(tiles);
  }

  private isLateGame(): boolean {
    const players = this.mg.players().filter(p => p.isAlive());
    const totalLandTiles = this.mg.numLandTiles();
    
    for (const player of players) {
      const ownershipRatio = player.numTilesOwned() / totalLandTiles;
      if (ownershipRatio > 0.5) return true;
    }
    
    if (this.mg.ticks() > 10000) return true;
    if (players.length <= 3) return true;
    
    return false;
  }

  private getDynamicReserveRatio(): number {
    if (this.isLateGame()) {
      // In late game, keep fewer troops in reserve
      return Math.max(0.1, this.reserveRatio - 0.2);
    }
    return this.reserveRatio;
  }

  private maybeBuildStructures() {
    // Only build if we have spare gold
    if (this.bot.gold() < 500_000n) return;
    
    // Priority order: Cities > Ports > Defense Posts > SAM Launchers
    const cities = this.bot.units(UnitType.City);
    const ports = this.bot.units(UnitType.Port);
    const defensePosts = this.bot.units(UnitType.DefensePost);
    const samLaunchers = this.bot.units(UnitType.SAMLauncher);
    
    // Build cities for population growth
    if (cities.length < 5 && this.bot.gold() >= 1_000_000n && this.random.chance(3)) {
      this.buildCity();
      return;
    }
    
    // Build ports if we have coastline
    if (ports.length < 3 && this.bot.gold() >= 500_000n && this.random.chance(4)) {
      this.buildPort();
      return;
    }
    
    // Build defense posts on borders
    if (defensePosts.length < 10 && this.bot.gold() >= 250_000n && this.random.chance(5)) {
      this.buildDefensePost();
      return;
    }
    
    // Build SAM launchers in late game
    if (this.isLateGame() && samLaunchers.length < 3 && this.bot.gold() >= 3_000_000n) {
      this.buildSAMLauncher();
      return;
    }
  }

  private buildCity() {
    const tiles = Array.from(this.bot.tiles());
    const goodCityTiles = tiles.filter(tile => {
      // Don't build on border
      if (this.bot.borderTiles().has(tile)) return false;
      
      // Check distance from other cities
      const cities = this.bot.units(UnitType.City);
      for (const city of cities) {
        if (this.mg.manhattanDist(tile, city.tile()) < 30) return false;
      }
      
      return this.bot.canBuild(UnitType.City, tile) !== false;
    });
    
    if (goodCityTiles.length === 0) return;
    
    const targetTile = this.random.randElement(goodCityTiles);
    const buildTile = this.bot.canBuild(UnitType.City, targetTile);
    
    if (buildTile !== false) {
      this.bot.buildUnit(UnitType.City, buildTile, {});
    }
  }

  private buildPort() {
    const coastalTiles = Array.from(this.bot.tiles()).filter(tile => {
      // Find tiles adjacent to water
      const neighbors = this.mg.neighbors(tile);
      return neighbors.some(n => this.mg.isWater(n));
    });
    
    const goodPortTiles = coastalTiles.filter(tile => {
      return this.bot.canBuild(UnitType.Port, tile) !== false;
    });
    
    if (goodPortTiles.length === 0) return;
    
    const targetTile = this.random.randElement(goodPortTiles);
    const buildTile = this.bot.canBuild(UnitType.Port, targetTile);
    
    if (buildTile !== false) {
      this.bot.buildUnit(UnitType.Port, buildTile, {});
    }
  }

  private buildDefensePost() {
    const borderTiles = Array.from(this.bot.borderTiles());
    const goodDefenseTiles = borderTiles.filter(tile => {
      // Check if there are enemy tiles nearby
      let hasEnemyNearby = false;
      // Check in a simple radius around the tile
      for (let dx = -10; dx <= 10; dx++) {
        for (let dy = -10; dy <= 10; dy++) {
          const x = this.mg.x(tile) + dx;
          const y = this.mg.y(tile) + dy;
          if (x >= 0 && x < this.mg.width() && y >= 0 && y < this.mg.height()) {
            const nearbyTile = this.mg.ref(x, y);
            const owner = this.mg.owner(nearbyTile);
            if (owner.isPlayer() && owner !== this.bot && !this.bot.isFriendly(owner)) {
              hasEnemyNearby = true;
              break;
            }
          }
        }
        if (hasEnemyNearby) break;
      }
      
      if (!hasEnemyNearby) return false;
      
      return this.bot.canBuild(UnitType.DefensePost, tile) !== false;
    });
    
    if (goodDefenseTiles.length === 0) return;
    
    const targetTile = this.random.randElement(goodDefenseTiles);
    const buildTile = this.bot.canBuild(UnitType.DefensePost, targetTile);
    
    if (buildTile !== false) {
      this.bot.buildUnit(UnitType.DefensePost, buildTile, {});
    }
  }

  private buildSAMLauncher() {
    const tiles = Array.from(this.bot.tiles());
    const goodSAMTiles = tiles.filter(tile => {
      // Build SAMs in central locations
      if (this.bot.borderTiles().has(tile)) return false;
      
      // Check distance from other SAMs
      const sams = this.bot.units(UnitType.SAMLauncher);
      for (const sam of sams) {
        if (this.mg.manhattanDist(tile, sam.tile()) < 50) return false;
      }
      
      return this.bot.canBuild(UnitType.SAMLauncher, tile) !== false;
    });
    
    if (goodSAMTiles.length === 0) return;
    
    const targetTile = this.random.randElement(goodSAMTiles);
    const buildTile = this.bot.canBuild(UnitType.SAMLauncher, targetTile);
    
    if (buildTile !== false) {
      this.bot.buildUnit(UnitType.SAMLauncher, buildTile, {});
    }
  }

  private maybeAttack() {
    if (this.behavior === null) {
      throw new Error("not initialized");
    }
    const toAttack = this.behavior.getNeighborTraitorToAttack();
    if (toAttack !== null) {
      const odds = this.bot.isFriendly(toAttack) ? 6 : 3;
      if (this.random.chance(odds)) {
        this.behavior.sendAttack(toAttack);
        return;
      }
    }

    if (this.neighborsTerraNullius) {
      if (this.bot.sharesBorderWith(this.mg.terraNullius())) {
        this.behavior.sendAttack(this.mg.terraNullius());
        return;
      }
      this.neighborsTerraNullius = false;
    }

    this.behavior.forgetOldEnemies();
    const enemy = this.behavior.selectRandomEnemy();
    if (!enemy) return;
    if (!this.bot.sharesBorderWith(enemy)) return;
    this.behavior.sendAttack(enemy);
  }

  private maybeUseTransportShips() {
    // Only consider transport ships if we have ports and sufficient troops
    const ports = this.bot.units(UnitType.Port);
    if (ports.length === 0) return;
    
    // Check if we have enough troops to send
    const maxPop = this.mg.config().maxPopulation(this.bot);
    const maxTroops = maxPop * this.bot.targetTroopRatio();
    const reserveTroops = maxTroops * this.getDynamicReserveRatio();
    const availableTroops = this.bot.troops() - reserveTroops;
    
    if (availableTroops < 5000) return;
    
    // Find potential targets across water
    const potentialTargets = this.findCrossWaterTargets();
    if (potentialTargets.length === 0) return;
    
    // Pick a target and create transport ship
    const target = this.random.randElement(potentialTargets);
    const troopsToSend = Math.floor(availableTroops / 3);
    
    // Find best spawn location for transport ship
    const spawnTile = this.bot.bestTransportShipSpawn(target.tile);
    if (spawnTile === false) return;
    
    // Build transport ship with troops
    this.bot.buildUnit(UnitType.TransportShip, spawnTile, {
      troops: troopsToSend,
      destination: target.tile
    });
  }

  private findCrossWaterTargets(): Array<{player: Player, tile: number}> {
    const targets: Array<{player: Player, tile: number}> = [];
    
    // Look for enemies that we can't reach by land
    const enemies = this.mg.players().filter(p => 
      p.isAlive() && 
      p !== this.bot && 
      !this.bot.isFriendly(p) &&
      !this.bot.sharesBorderWith(p)
    );
    
    for (const enemy of enemies) {
      // Find coastal tiles of the enemy
      const enemyCoastalTiles = Array.from(enemy.tiles()).filter(tile => {
        const neighbors = this.mg.neighbors(tile);
        return neighbors.some(n => this.mg.isWater(n));
      });
      
      if (enemyCoastalTiles.length > 0) {
        targets.push({
          player: enemy,
          tile: this.random.randElement(enemyCoastalTiles)
        });
      }
    }
    
    return targets;
  }

  isActive(): boolean {
    return this.active;
  }
}
