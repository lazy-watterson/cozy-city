/**
 * Game Scene
 *
 * Main gameplay scene. This is where you build your game!
 *
 * Add systems to handle different aspects of your game:
 * - Movement system for player/entity movement
 * - Collision system for physics/detection
 * - Render system for drawing sprites and effects
 *
 * Example system:
 *   class PlayerSystem implements System {
 *     readonly id = 'player';
 *     readonly priority = 50;
 *     enabled = true;
 *
 *     update(dt: number, scene: Scene): void {
 *       // Handle player movement...
 *     }
 *
 *     render(scene: Scene): void {
 *       // Draw player...
 *     }
 *   }
 *
 *   // In GameScene.init():
 *   this.addSystem(new PlayerSystem());
 */

import { MakkoEngine } from '@makko/engine';
import { BaseScene } from '../scene/base-scene';
import type { Game } from '../game/game';

/**
 * Main gameplay scene.
 *
 * This scene is empty by default - add your own systems and logic!
 *
 * Controls:
 * - Escape: Return to start screen
 */
export class GameScene extends BaseScene {
  readonly id = 'game';

  private game: Game;

  constructor(game: Game) {
    super();
    this.game = game;
  }

  init(): void {
    // Add your systems here:
    // this.addSystem(new PlayerSystem());
    // this.addSystem(new EnemySystem());
    // this.addSystem(new CollisionSystem());
  }

  enter(previousScene?: string): void {
    // Initialize gameplay state when entering
    console.log('[GameScene] Entered from:', previousScene);
  }

  exit(nextScene?: string): void {
    // Cleanup when leaving
    console.log('[GameScene] Exiting to:', nextScene);
  }

  handleInput(): void {
    // Let systems handle input first
    super.handleInput();

    // Scene-level input
    const input = MakkoEngine.input;

    // Return to start on Escape
    if (input.isKeyPressed('Escape')) {
      this.switchTo('start');
    }
  }

  update(dt: number): void {
    // Let systems update first
    super.update(dt);

    // Scene-level update logic here
  }

  render(): void {
    // Let systems render first
    super.render();

    // Scene-level rendering here
    const display = MakkoEngine.display;

    // Placeholder text
    const font = '24px monospace';
    const text = 'Game Scene - Press ESC to return';
    const metrics = display.measureText(text, { font });
    display.drawText(
      text,
      display.width / 2 - metrics.width / 2,
      display.height / 2,
      { font, fill: '#666666' }
    );
  }
}
