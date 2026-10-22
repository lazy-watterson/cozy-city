/**
 * Scene Manager — manages scene lifecycle and transitions.
 *
 * Scene creation: extend BaseScene and implement init() to register systems.
 * Use switchTo() for full transitions, push()/pop() for overlays (pause menus, modals).
 *
 * System priority: lower priority runs earlier. Recommended bands:
 *   - input: 0–49
 *   - logic: 50–149
 *   - render: 150–200
 *
 * Overlays: push('pause') stacks a scene on top. The underlying scene stops
 * receiving updates but still renders when using render() (not renderCurrent()).
 */

import type { Scene } from './interfaces';

/**
 * Manages game scenes and their transitions.
 *
 * The SceneManager maintains a stack of active scenes. The top scene
 * receives all lifecycle callbacks. Use push/pop for overlays.
 *
 * Example:
 *   const scenes = new SceneManager();
 *
 *   await scenes.register(new StartScene());
 *   await scenes.register(new GameScene());
 *   await scenes.register(new PauseScene());
 *
 *   scenes.switchTo('start');  // Show start screen
 *   scenes.switchTo('game');   // Start game (replaces start)
 *   scenes.push('pause');      // Overlay pause menu
 *   scenes.pop();              // Return to game
 */
export class SceneManager {
  /** All registered scenes */
  private scenes = new Map<string, Scene>();

  /** Stack of active scenes (top = current) */
  private stack: Scene[] = [];

  /**
   * Register a scene with the manager.
   * Calls init() if defined.
   *
   * @param scene - Scene to register
   * @throws Error if scene with same ID already exists
   */
  async register(scene: Scene): Promise<void> {
    if (this.scenes.has(scene.id)) {
      throw new Error(`Scene with id "${scene.id}" already registered`);
    }

    // Attach manager reference
    scene.manager = this;

    // Call init lifecycle
    await scene.init?.();

    this.scenes.set(scene.id, scene);
  }

  /**
   * Unregister a scene from the manager.
   * Calls destroy() if defined.
   *
   * @param sceneId - ID of scene to unregister
   */
  unregister(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    // Remove from stack if active
    this.stack = this.stack.filter((s) => s.id !== sceneId);

    // Call destroy lifecycle
    scene.destroy?.();

    // Remove manager reference
    scene.manager = undefined;

    this.scenes.delete(sceneId);
  }

  /**
   * Switch to a scene (replaces entire stack).
   * Exits all current scenes and enters the target.
   *
   * @param sceneId - ID of scene to switch to
   * @throws Error if scene not registered
   */
  switchTo(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene "${sceneId}" not registered`);
    }

    // Exit all scenes in stack (top to bottom)
    for (let i = this.stack.length - 1; i >= 0; i--) {
      this.stack[i].exit?.(sceneId);
    }

    const previousId = this.current?.id;

    // Replace stack with single scene
    this.stack = [scene];

    // Enter new scene
    scene.enter?.(previousId);
  }

  /**
   * Push a scene on top of the stack (for overlays).
   * The current scene remains active but stops receiving updates.
   *
   * @param sceneId - ID of scene to push
   * @throws Error if scene not registered
   */
  push(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene "${sceneId}" not registered`);
    }

    const previousId = this.current?.id;

    // Exit current scene (but keep in stack)
    this.current?.exit?.(sceneId);

    // Push new scene
    this.stack.push(scene);

    // Enter new scene
    scene.enter?.(previousId);
  }

  /**
   * Pop the current scene and return to the previous one.
   * Does nothing if stack has only one scene.
   *
   * @returns ID of popped scene, or undefined if stack was empty/single
   */
  pop(): string | undefined {
    if (this.stack.length <= 1) {
      console.warn('[SceneManager] Cannot pop: stack would be empty');
      return undefined;
    }

    const popped = this.stack.pop()!;
    const nextId = this.current?.id;

    // Exit popped scene
    popped.exit?.(nextId);

    // Re-enter the now-current scene
    this.current?.enter?.(popped.id);

    return popped.id;
  }

  /**
   * Get the current (top) scene.
   */
  get current(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Get the current stack depth.
   */
  get stackDepth(): number {
    return this.stack.length;
  }

  /**
   * Check if a scene is registered.
   *
   * @param sceneId - ID of scene to check
   */
  has(sceneId: string): boolean {
    return this.scenes.has(sceneId);
  }

  /**
   * Get a registered scene by ID.
   *
   * @param sceneId - ID of scene to retrieve
   */
  get<T extends Scene>(sceneId: string): T | undefined {
    return this.scenes.get(sceneId) as T | undefined;
  }

  /**
   * Check if a scene is currently active (in stack).
   *
   * @param sceneId - ID of scene to check
   */
  isActive(sceneId: string): boolean {
    return this.stack.some((s) => s.id === sceneId);
  }

  // ============================================================================
  // Game Loop Delegation
  // ============================================================================

  /**
   * Handle input for the current scene.
   */
  handleInput(): void {
    this.current?.handleInput?.();
  }

  /**
   * Update the current scene.
   *
   * @param dt - Delta time in milliseconds
   */
  update(dt: number): void {
    this.current?.update?.(dt);
  }

  /**
   * Render all scenes in the stack (bottom to top).
   * This allows underlying scenes to show through (for pause overlays).
   */
  render(): void {
    for (const scene of this.stack) {
      scene.render?.();
    }
  }

  /**
   * Render only the current (top) scene.
   * Use this if you don't want stacked scenes to render.
   */
  renderCurrent(): void {
    this.current?.render?.();
  }

  // ============================================================================
  // Lifecycle Helpers
  // ============================================================================

  /**
   * Unregister all scenes.
   */
  clear(): void {
    // Exit all active scenes
    for (let i = this.stack.length - 1; i >= 0; i--) {
      this.stack[i].exit?.();
    }
    this.stack = [];

    // Destroy all scenes
    for (const scene of this.scenes.values()) {
      scene.destroy?.();
      scene.manager = undefined;
    }
    this.scenes.clear();
  }

  /**
   * Get all registered scene IDs.
   */
  getSceneIds(): string[] {
    return Array.from(this.scenes.keys());
  }

  /**
   * Get the current scene stack (bottom to top).
   */
  getStack(): readonly Scene[] {
    return this.stack;
  }
}
