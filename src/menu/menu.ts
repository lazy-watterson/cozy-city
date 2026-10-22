/**
 * Menu System — keyboard-navigable menu that dispatches item actions.
 *
 * Use for title screens, pause menus, and settings. Rendering, theming, and
 * placement come from the ui-layer ListMenu widget — pass an `anchor` instead
 * of computing coordinates.
 *
 * Usage:
 *   const menu = new Menu({ anchor: 'center' });        // or y: 80 to sit below a title
 *   menu.addItem({ label: 'Start Game', action: () => startGame() });
 *   menu.addItem({ label: 'Options', action: () => showOptions() });
 *
 *   // In update:
 *   menu.update(dt);                                    // enables hover/click/tap
 *   if (input.isKeyPressed('ArrowUp')) menu.navigateUp();
 *   if (input.isKeyPressed('ArrowDown')) menu.navigateDown();
 *   if (input.isKeyPressed('Enter')) menu.select();
 *
 *   // In render:
 *   menu.render();                                      // no coordinates — anchored
 *
 * Disabled items: set `enabled: false` on an item to grey it out; navigation
 * skips it. Styling comes from UI_THEME (override theme tokens to re-skin).
 */

import { type UIAnchor, type TextSize } from '../ui/ui-layer';
import { ListMenu } from '../ui/ui-list-menu';

/**
 * A single menu item with label and action.
 */
export interface MenuItem {
  /** Display label for the menu item */
  label: string;

  /** Action to execute when selected */
  action: () => void;

  /** Whether this item can be selected (default: true) */
  enabled?: boolean;
}

export interface MenuOptions {
  /** Screen region to pin to. Default 'center'. */
  anchor?: UIAnchor;
  /** Fine-tune offsets from the anchor point (e.g. y: 80 to sit below a title) */
  x?: number;
  y?: number;
  /** Text size token. Default '2xl' (title-menu scale) */
  size?: TextSize;
  /** Selector glyph. Default '>' */
  selector?: string;
  /** Label alignment. Default 'center' */
  align?: 'left' | 'center';
  /** Draw a surface panel behind the items. Default false */
  panel?: boolean;
}

/**
 * A navigable menu with keyboard, mouse, and touch support.
 * Wraps ui-layer's ListMenu and dispatches item actions on select/click.
 */
export class Menu {
  private items: MenuItem[] = [];
  private list: ListMenu;

  constructor(options: MenuOptions = {}) {
    this.list = new ListMenu({
      items: [],
      anchor: options.anchor ?? 'center',
      x: options.x,
      y: options.y,
      size: options.size,
      selector: options.selector,
      align: options.align,
      panel: options.panel,
    });
  }

  /**
   * Add an item to the menu.
   */
  addItem(item: MenuItem): void {
    if (item.enabled === undefined) {
      item.enabled = true;
    }
    this.items.push(item);
    this.sync();
  }

  /**
   * Remove an item by label.
   */
  removeItem(label: string): void {
    this.items = this.items.filter((item) => item.label !== label);
    this.sync();
  }

  /**
   * Clear all items from the menu.
   */
  clear(): void {
    this.items = [];
    this.sync();
  }

  /**
   * Navigate up to the previous enabled item.
   */
  navigateUp(): void {
    this.list.navigateUp();
  }

  /**
   * Navigate down to the next enabled item.
   */
  navigateDown(): void {
    this.list.navigateDown();
  }

  /**
   * Execute the action of the currently selected item.
   */
  select(): void {
    const item = this.items[this.list.getSelectedIndex()];
    if (item?.enabled) {
      item.action();
    }
  }

  getSelectedIndex(): number {
    return this.list.getSelectedIndex();
  }

  setSelectedIndex(index: number): void {
    this.list.setSelectedIndex(index);
  }

  getItems(): readonly MenuItem[] {
    return this.items;
  }

  get count(): number {
    return this.items.length;
  }

  /**
   * Enable or disable an item by label.
   */
  setItemEnabled(label: string, enabled: boolean): void {
    const item = this.items.find((i) => i.label === label);
    if (item) {
      item.enabled = enabled;
      this.sync();
    }
  }

  /**
   * Per-frame update. Optional but recommended: enables hover highlight and
   * click/tap to select — a click dispatches that item's action.
   */
  update(dt: number): void {
    this.list.update(dt);
    const clicked = this.list.getClickedIndex();
    if (clicked >= 0) {
      const item = this.items[clicked];
      if (item?.enabled) {
        item.action();
      }
    }
  }

  /**
   * Render the menu. Placement comes from the constructor options.
   */
  render(): void {
    this.list.render();
  }

  private sync(): void {
    const selected = this.list.getSelectedIndex();
    this.list.setItems(this.items.map((i) => ({ label: i.label, disabled: !i.enabled })));
    this.list.setSelectedIndex(selected);
  }
}
