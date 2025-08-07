/**
 * Event Manager
 * Manages event listeners with automatic cleanup
 */

export class EventManager {
  private listeners: Map<
    string,
    { element: Element; type: string; handler: EventListener }
  > = new Map();
  private counter = 0;

  addListener(
    element: Element,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    const key = `${element.tagName}-${type}-${Date.now()}-${++this.counter}`;
    this.listeners.set(key, { element, type, handler });
    element.addEventListener(type, handler, options);
  }

  removeListener(key: string): void {
    const listener = this.listeners.get(key);
    if (listener) {
      listener.element.removeEventListener(listener.type, listener.handler);
      this.listeners.delete(key);
    }
  }

  removeAllListeners(): void {
    this.listeners.forEach((listener, key) => {
      listener.element.removeEventListener(listener.type, listener.handler);
    });
    this.listeners.clear();
  }

  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Global event manager instance
export const globalEventManager = new EventManager();
