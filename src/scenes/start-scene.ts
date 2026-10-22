/**
 * Start Scene
 *
 * Title screen with main menu.
 * Displays game title and menu with "Start Game" option.
 */

import { MakkoEngine } from '@makko/engine';
import { BaseScene } from '../scene/base-scene';
import { Menu } from '../menu/menu';
import type { Game } from '../game/game';

/**
 * Title screen scene with main menu.
 *
 * Shows:
 * - Game title
 * - "Start Game" menu option
 *
 * Controls:
 * - Arrow Up/Down: Navigate menu
 * - Enter/Space: Select menu item
 */
export class StartScene extends BaseScene {
  readonly id = 'start';

  private menu: Menu;
  private game: Game;

  constructor(game: Game) {
    super();
    this.game = game;
    this.menu = new Menu({ y: 50 });
  }

  init(): void {
    // Set up menu items
    this.menu.addItem({
      label: 'Start Game',
      action: () => this.switchTo('game'),
    });

    // Add more menu items as needed:
    // this.menu.addItem({
    //   label: 'Options',
    //   action: () => this.switchTo('options'),
    // });
  }

  enter(previousScene?: string): void {
    // Reset menu selection when entering
    this.menu.setSelectedIndex(0);
  }

  handleInput(): void {
    const input = MakkoEngine.input;

    if (input.isKeyPressed('ArrowUp')) {
      this.menu.navigateUp();
    }

    if (input.isKeyPressed('ArrowDown')) {
      this.menu.navigateDown();
    }

    if (input.isKeyPressed('Enter') || input.isKeyPressed('Space')) {
      this.menu.select();
    }
  }

  update(dt: number): void {
    super.update(dt);
    this.menu.update(dt);
  }

  render(): void {
    const display = MakkoEngine.display;
    const centerX = display.width / 2;
    const centerY = display.height / 2;

    // Draw title (upper third of screen)
    const titleFont = '72px monospace';
    const title = 'My Game';
    const titleMetrics = display.measureText(title, { font: titleFont });
    display.drawText(title, centerX - titleMetrics.width / 2, centerY - 180, { font: titleFont, fill: '#ffffff' });

    // Draw subtitle
    const subtitleFont = '24px monospace';
    const subtitle = 'A MakkoEngine Game';
    const subtitleMetrics = display.measureText(subtitle, { font: subtitleFont });
    display.drawText(subtitle, centerX - subtitleMetrics.width / 2, centerY - 70, { font: subtitleFont, fill: '#666666' });

    // Draw menu (centered)
    this.menu.render();

    // Draw footer hint
    const hintFont = '16px monospace';
    const hint = 'Arrow Keys to navigate  |  Enter to select';
    const hintMetrics = display.measureText(hint, { font: hintFont });
    display.drawText(hint, centerX - hintMetrics.width / 2, display.height - 80, { font: hintFont, fill: '#555555' });
  }
}
