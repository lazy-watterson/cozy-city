/**
 * System Registry
 *
 * Manages a collection of systems with priority-based execution.
 * Systems are sorted by priority (lower = earlier execution).
 */

import type { System, Scene } from './interfaces';

/**
 * Manages systems for a scene with priority-based execution order.
 *
 * Example:
 *   const registry = new SystemRegistry();
 *   registry.register(new MovementSystem(), scene);
 *   registry.register(new RenderSystem(), scene);
 *
 *   // In game loop:
 *   registry.handleInput(scene);
 *   registry.update(dt, scene);
 *   registry.render(scene);
 */
export class SystemRegistry {
  private systems: System[] = [];
  private systemMap = new Map<string, System>();

  /**
   * Register a system with the registry.
   * Systems are automatically sorted by priority.
   *
   * @param system - System to register
   * @param scene - Parent scene (passed to onMount)
   * @throws Error if system with same ID already exists
   */
  register(system: System, scene: Scene): void {
    if (this.systemMap.has(system.id)) {
      throw new Error(`System with id "${system.id}" already registered`);
    }

    this.systems.push(system);
    this.systemMap.set(system.id, system);

    // Sort by priority (lower = earlier)
    this.systems.sort((a, b) => a.priority - b.priority);

    // Call mount lifecycle
    system.onMount?.(scene);
  }

  /**
   * Unregister a system from the registry.
   *
   * @param systemId - ID of system to remove
   * @param scene - Parent scene (passed to onUnmount)
   */
  unregister(systemId: string, scene: Scene): void {
    const system = this.systemMap.get(systemId);
    if (!system) return;

    // Call unmount lifecycle
    system.onUnmount?.(scene);

    // Remove from collections
    this.systemMap.delete(systemId);
    this.systems = this.systems.filter((s) => s.id !== systemId);
  }

  /**
   * Get a system by ID.
   *
   * @param systemId - ID of system to retrieve
   * @returns System or undefined if not found
   */
  get<T extends System>(systemId: string): T | undefined {
    return this.systemMap.get(systemId) as T | undefined;
  }

  /**
   * Check if a system is registered.
   *
   * @param systemId - ID of system to check
   */
  has(systemId: string): boolean {
    return this.systemMap.has(systemId);
  }

  /**
   * Enable a system.
   *
   * @param systemId - ID of system to enable
   */
  enable(systemId: string): void {
    const system = this.systemMap.get(systemId);
    if (system) {
      system.enabled = true;
    }
  }

  /**
   * Disable a system (stops receiving updates).
   *
   * @param systemId - ID of system to disable
   */
  disable(systemId: string): void {
    const system = this.systemMap.get(systemId);
    if (system) {
      system.enabled = false;
    }
  }

  /**
   * Toggle a system's enabled state.
   *
   * @param systemId - ID of system to toggle
   * @returns New enabled state
   */
  toggle(systemId: string): boolean {
    const system = this.systemMap.get(systemId);
    if (system) {
      system.enabled = !system.enabled;
      return system.enabled;
    }
    return false;
  }

  /**
   * Call handleInput on all enabled systems.
   *
   * @param scene - Parent scene
   */
  handleInput(scene: Scene): void {
    for (const system of this.systems) {
      if (system.enabled && system.handleInput) {
        system.handleInput(scene);
      }
    }
  }

  /**
   * Call update on all enabled systems.
   *
   * @param dt - Delta time in milliseconds
   * @param scene - Parent scene
   */
  update(dt: number, scene: Scene): void {
    for (const system of this.systems) {
      if (system.enabled && system.update) {
        system.update(dt, scene);
      }
    }
  }

  /**
   * Call render on all enabled systems.
   *
   * @param scene - Parent scene
   */
  render(scene: Scene): void {
    for (const system of this.systems) {
      if (system.enabled && system.render) {
        system.render(scene);
      }
    }
  }

  /**
   * Get all registered systems.
   */
  getAll(): readonly System[] {
    return this.systems;
  }

  /**
   * Get count of registered systems.
   */
  get count(): number {
    return this.systems.length;
  }

  /**
   * Unregister all systems.
   *
   * @param scene - Parent scene (passed to onUnmount)
   */
  clear(scene: Scene): void {
    // Unmount in reverse priority order
    for (let i = this.systems.length - 1; i >= 0; i--) {
      this.systems[i].onUnmount?.(scene);
    }
    this.systems = [];
    this.systemMap.clear();
  }
}
