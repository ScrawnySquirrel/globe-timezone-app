export class TooltipOverlay {
  private readonly el: HTMLElement;
  private isVisible = false;

  constructor() {
    this.el = document.createElement("div");
    this.el.style.cssText = "position:fixed;pointer-events:none;padding:4px 8px;background:rgba(0,0,0,0.75);color:#fff;font-size:13px;font-family:monospace;border-radius:4px;white-space:nowrap;display:none;z-index:9999;transform:translate(12px,-50%)";
    document.body.appendChild(this.el);
  }

  update(label: string | null, x: number, y: number): void {
    if (label === null) { this.el.style.display = "none"; this.isVisible = false; return; }
    this.el.textContent = label;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    if (!this.isVisible) { this.el.style.display = "block"; this.isVisible = true; }
  }

  dispose(): void { this.el.remove(); }
}
