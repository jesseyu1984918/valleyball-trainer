export class Keyboard {
  constructor(target = window) {
    this.held = new Set();
    this.actions = [];

    target.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();

      if (['w', 'a', 's', 'd'].includes(key)) {
        this.held.add(key);
        event.preventDefault();
      }

      if (!event.repeat && ['m', 'l', 'r', '1', '2', '3'].includes(key)) {
        this.actions.push(key);
      }
    });

    target.addEventListener('keyup', (event) => {
      this.held.delete(event.key.toLowerCase());
    });
  }

  movement() {
    return {
      x: (this.held.has('d') ? 1 : 0) - (this.held.has('a') ? 1 : 0),
      z: (this.held.has('s') ? 1 : 0) - (this.held.has('w') ? 1 : 0)
    };
  }

  consume() {
    return this.actions.shift() ?? null;
  }
}
