/**
 * ListMenu — selectable command/list menu with a selector marker.
 *
 * THE widget for battle command menus, title menus, pause menus, and any
 * vertical list of selectable options. Auto-sizes, themed, keyboard-agnostic:
 * drive it from your own input polling and read the selection back.
 *
 *   const menu = new ListMenu({
 *     items: ['Attack', 'Skill', 'Defend', 'Flee'],
 *     anchor: 'bottom-left',
 *     panel: true,               // draws its own surface behind the items
 *     size: 'lg',
 *     align: 'left',
 *   });
 *
 *   // update:
 *   menu.update(dt);
 *   if (input.isKeyPressed('ArrowUp')) menu.navigateUp();
 *   if (input.isKeyPressed('ArrowDown')) menu.navigateDown();
 *   if (input.isKeyPressed('Enter')) doAction(menu.getSelectedIndex());
 *   const clicked = menu.getClickedIndex();          // mouse/touch, -1 if none
 *   if (clicked >= 0) doAction(clicked);
 *
 *   // render:
 *   menu.render();
 */

import { MakkoEngine } from '@makko/engine';
import {
  type UIPlacement,
  type TextSize,
  UIWidget,
  UI_THEME,
  fontFor,
  fontSizeOf,
  measureTextWidth,
  getPointer,
} from './ui-layer';

export interface ListMenuItem {
  label: string;
  disabled?: boolean;
}

export interface ListMenuOptions extends UIPlacement {
  items: Array<string | ListMenuItem>;
  selectedIndex?: number;
  /** Marker glyph drawn beside the selected item. Default '>' */
  selector?: string;
  /** Default '2xl' (title-menu scale); use 'lg' or 'md' for in-game menus */
  size?: TextSize;
  /** Label alignment within the menu box. Default 'center' */
  align?: 'left' | 'center';
  /** Vertical space between items. Default half the font size */
  gap?: number;
  /** Omit for auto-width from the widest label */
  width?: number;
  /** Draw a Panel-style surface behind the items. Default false */
  panel?: boolean;
  /** Hover-to-select and click/tap support. Default true */
  mouse?: boolean;
}

/**
 * ListMenu - vertical option list with wrap-around navigation that skips
 * disabled items. The selector column is reserved so labels never shift
 * when the selection moves.
 */
export class ListMenu extends UIWidget {
  selectedIndex = 0;
  selector: string;
  size: TextSize;
  align: 'left' | 'center';
  gap: number;
  panel: boolean;
  mouse: boolean;

  private items: ListMenuItem[] = [];
  private clickedIndex = -1;
  private armedIndex = -1;

  constructor(options: ListMenuOptions) {
    super(options);
    this.selector = options.selector ?? '>';
    this.size = options.size ?? '2xl';
    this.align = options.align ?? 'center';
    this.gap = options.gap ?? Math.round(fontSizeOf(options.size ?? '2xl') * 0.5);
    this.panel = options.panel ?? false;
    this.mouse = options.mouse ?? true;
    this.setItems(options.items);
    if (options.selectedIndex !== undefined) {
      this.setSelectedIndex(options.selectedIndex);
    }
  }

  // -- items --

  setItems(items: Array<string | ListMenuItem>): void {
    this.items = items.map((item) =>
      typeof item === 'string' ? { label: item } : { label: item.label, disabled: item.disabled }
    );
    this.ensureValidSelection();
  }

  getItems(): readonly ListMenuItem[] {
    return this.items;
  }

  get count(): number {
    return this.items.length;
  }

  setItemDisabled(index: number, disabled: boolean): void {
    if (index >= 0 && index < this.items.length) {
      this.items[index].disabled = disabled;
      this.ensureValidSelection();
    }
  }

  // -- selection --

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  setSelectedIndex(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.selectedIndex = index;
      this.ensureValidSelection();
    }
  }

  getSelectedItem(): ListMenuItem | null {
    return this.items[this.selectedIndex] ?? null;
  }

  navigateUp(): void {
    this.step(-1);
  }

  navigateDown(): void {
    this.step(1);
  }

  /**
   * Index whose row was clicked/tapped this frame, or -1.
   * Requires update(dt) each frame, like Button.isClicked().
   */
  getClickedIndex(): number {
    return this.clickedIndex;
  }

  private step(dir: -1 | 1): void {
    if (this.items.length === 0) return;
    const start = this.selectedIndex;
    do {
      this.selectedIndex = (this.selectedIndex + dir + this.items.length) % this.items.length;
      if (this.selectedIndex === start) break;
    } while (this.items[this.selectedIndex].disabled);
  }

  private ensureValidSelection(): void {
    if (this.items.length === 0) {
      this.selectedIndex = 0;
      return;
    }
    if (this.selectedIndex >= this.items.length) {
      this.selectedIndex = this.items.length - 1;
    }
    if (this.items[this.selectedIndex]?.disabled) {
      const start = this.selectedIndex;
      do {
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        if (this.selectedIndex === start) break;
      } while (this.items[this.selectedIndex]?.disabled);
    }
  }

  // -- geometry --

  private padding(): number {
    return this.panel ? UI_THEME.spacing.lg : 0;
  }

  /** Reserved marker column so labels never shift when selection moves */
  private selectorColumn(): number {
    return measureTextWidth(this.selector, fontFor(this.size)) + UI_THEME.spacing.sm;
  }

  private rowHeight(): number {
    return fontSizeOf(this.size);
  }

  protected measureWidth(): number {
    let maxLabel = 0;
    for (const item of this.items) {
      maxLabel = Math.max(maxLabel, measureTextWidth(item.label, fontFor(this.size)));
    }
    return this.selectorColumn() + maxLabel + this.padding() * 2;
  }

  protected measureHeight(): number {
    const n = Math.max(1, this.items.length);
    return n * this.rowHeight() + (n - 1) * this.gap + this.padding() * 2;
  }

  private rowAt(px: number, py: number): number {
    if (!this.contains(px, py)) return -1;
    const localY = py - this.y - this.padding();
    const stride = this.rowHeight() + this.gap;
    const index = Math.floor(localY / stride);
    if (index < 0 || index >= this.items.length) return -1;
    // Ignore hits in the gap below a row
    if (localY - index * stride > this.rowHeight()) return -1;
    return index;
  }

  // -- protocol --

  protected tick(_dt: number): void {
    this.clickedIndex = -1;
    if (!this.mouse || this.items.length === 0) return;

    const p = getPointer();
    const row = this.rowAt(p.x, p.y);
    const enabled = row >= 0 && !this.items[row].disabled;

    if (enabled && !p.down) {
      this.selectedIndex = row;
    }
    if (p.pressed) {
      this.armedIndex = enabled ? row : -1;
    }
    if (p.released) {
      if (this.armedIndex >= 0 && row === this.armedIndex && enabled) {
        this.selectedIndex = row;
        this.clickedIndex = row;
      }
      this.armedIndex = -1;
    }
  }

  protected draw(): void {
    const display = MakkoEngine.display;
    const w = this.getWidth();
    const pad = this.padding();
    const font = fontFor(this.size);
    const stride = this.rowHeight() + this.gap;

    if (this.panel) {
      display.drawRoundRect(this.x, this.y, w, this.getHeight(), UI_THEME.radius.lg, {
        fill: UI_THEME.surface,
        stroke: UI_THEME.border,
        lineWidth: 1,
      });
    }

    const contentX = this.x + pad;
    const labelAreaX = contentX + this.selectorColumn();
    const labelAreaW = w - pad * 2 - this.selectorColumn();

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const rowY = this.y + pad + i * stride;
      const isSelected = i === this.selectedIndex;

      let fill: string;
      if (item.disabled) fill = UI_THEME.textDim;
      else if (isSelected) fill = UI_THEME.accent;
      else fill = UI_THEME.text;

      if (isSelected && !item.disabled) {
        display.drawText(this.selector, contentX, rowY, {
          font,
          fill: UI_THEME.accent,
          align: 'left',
          baseline: 'top',
        });
      }

      if (this.align === 'center') {
        display.drawText(item.label, labelAreaX + labelAreaW / 2, rowY, {
          font,
          fill,
          align: 'center',
          baseline: 'top',
        });
      } else {
        display.drawText(item.label, labelAreaX, rowY, {
          font,
          fill,
          align: 'left',
          baseline: 'top',
        });
      }
    }
  }
}
