/**
 * UI Modal Overlay
 *
 * Full-screen backdrop with a centered content panel. Use for game-over screens,
 * pause menus, and confirmation dialogs — never reimplement dimming/centering.
 *
 *   const modal = new Modal({
 *     title: 'Game Over',
 *     children: [scoreText, retryButton],
 *   });
 *   modal.update(dt);                       // or add to a UILayer (last = on top)
 *   modal.render();
 *   if (modal.isBackdropClicked()) modal.visible = false;
 */

import { MakkoEngine } from '@makko/engine';
import { type UIElement, type UIAnchor, UIWidget, UI_THEME, getPointer } from './ui-layer';
import { Panel, Text } from './ui-elements';

export interface ModalOptions {
  /** Convenience heading added above the children */
  title?: string;
  children?: UIElement[];
  /** Panel width. Omit to auto-size to content (default 320) */
  width?: number;
  gap?: number;
  padding?: number;
  backdropAlpha?: number;
  /** Where the panel sits on screen. Default 'center' */
  anchor?: UIAnchor;
}

/**
 * Modal - dimmed backdrop + panel. The panel is a real container: children are
 * measured, stacked, and stretched exactly like in a Panel/VStack.
 */
export class Modal extends UIWidget {
  private panel: Panel;
  private backdropAlpha: number;
  private backdropClicked = false;
  private armedOutside = false;

  constructor(options: ModalOptions = {}) {
    super({ anchor: options.anchor ?? 'center' });
    this.backdropAlpha = options.backdropAlpha ?? 0.6;

    const children: UIElement[] = [];
    if (options.title) {
      children.push(new Text({ text: options.title, size: 'lg', bold: true, align: 'center' }));
    }
    for (const child of options.children ?? []) children.push(child);

    this.panel = new Panel({
      width: options.width ?? 320,
      gap: options.gap ?? UI_THEME.spacing.md,
      padding: options.padding ?? UI_THEME.spacing.xl,
      children,
    });
    this.panel.layoutManaged = true;
  }

  add(element: UIElement): void {
    this.panel.add(element);
  }

  clear(): void {
    this.panel.clear();
  }

  /** True on the frame the user clicks/taps outside the panel */
  isBackdropClicked(): boolean {
    return this.backdropClicked;
  }

  protected measureWidth(): number {
    return this.panel.getWidth();
  }

  protected measureHeight(): number {
    return this.panel.getHeight();
  }

  protected arrange(): void {
    this.panel.x = this.x;
    this.panel.y = this.y;
    this.panel.layout();
  }

  protected tick(dt: number): void {
    this.backdropClicked = false;
    const p = getPointer();
    const outside = !this.contains(p.x, p.y);
    if (p.pressed && outside) this.armedOutside = true;
    if (p.released) {
      if (this.armedOutside && outside) this.backdropClicked = true;
      this.armedOutside = false;
    } else if (!p.down) {
      this.armedOutside = false;
    }
    this.panel.update(dt);
  }

  protected draw(): void {
    const display = MakkoEngine.display;
    display.drawRect(0, 0, display.width, display.height, {
      fill: '#000000',
      alpha: this.backdropAlpha,
    });
    this.panel.render();
  }
}
