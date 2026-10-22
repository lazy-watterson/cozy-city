/**
 * Game — main class with scene-based architecture.
 *
 * Delegates all game logic to scenes via SceneManager.
 *
 * Usage:
 *   const game = new Game();
 *   await game.init();
 *   game.start();
 *
 * Adding scenes: create a class extending BaseScene, implement
 * init/enter/exit/handleInput/update/render, then register it in Game.init().
 *
 * Adding systems: create a class implementing System with id/priority/enabled,
 * then call this.addSystem() from the owning scene's init().
 *
 * Scene transitions: use this.switchTo('sceneId') for full transitions,
 * this.pushScene('pause') to overlay, this.popScene() to return.
 */

import { MakkoEngine } from '@makko/engine';
import { SceneManager } from '../scene/scene-manager';
import { StartScene } from '../scenes/start-scene';
import { GameScene } from '../scenes/game-scene';

/**
 * Main Game class.
 *
 * Manages the game loop and delegates to SceneManager.
 * Add new scenes in init() and they'll be automatically
 * managed with proper lifecycle.
 */
export class Game {
  private scenes = new SceneManager();
  private lastTime = 0;
  private running = false;

  /**
   * Initialize game and register scenes.
   * Call this before start().
   */
  async init(): Promise<void> {
    // Register all scenes
    await this.scenes.register(new StartScene(this));
    await this.scenes.register(new GameScene(this));

    // Add more scenes as needed:
    // await this.scenes.register(new OptionsScene(this));
    // await this.scenes.register(new PauseScene(this));
  }

  /**
   * Start the game loop.
   * Switches to the start scene by default.
   */
  start(): void {
    this.running = true;
    this.lastTime = performance.now();

    // Start at the title screen
    this.scenes.switchTo('start');

    this.gameLoop();
  }

  /**
   * Stop the game loop.
   */
  stop(): void {
    this.running = false;
  }

  private gameLoop(): void {
    if (!this.running) return;

    const currentTime = performance.now();
    const dt = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Delegate to scene manager
    this.scenes.handleInput();
    this.scenes.update(dt);
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }

  private render(): void {
    const display = MakkoEngine.display;

    display.beginFrame();
    display.clear('#1a1a2e');

    // The city map is the fixed, full-canvas foundation beneath every scene.
    const cityMap = MakkoEngine.staticAsset('city_map');
    if (cityMap) {
      display.drawImage(cityMap.image, 0, 0, 1920, 1080, { pivot: null });
    }

    // Render all scenes in stack (for overlays)
    this.scenes.render();

    display.endFrame();

    // CRITICAL: Must call at end of each frame for input state tracking
    MakkoEngine.input.endFrame();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get the scene manager for advanced control.
   */
  getSceneManager(): SceneManager {
    return this.scenes;
  }

  /**
   * Switch to a scene by ID.
   *
   * @param sceneId - ID of scene to switch to
   */
  switchScene(sceneId: string): void {
    this.scenes.switchTo(sceneId);
  }
}
