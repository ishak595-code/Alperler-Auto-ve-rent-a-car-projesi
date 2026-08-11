import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appDragToScroll]',
  standalone: true
})
export class DragToScrollDirective {
  private isDown = false;
  private startX: number = 0;
  private scrollLeft: number = 0;

  constructor(private el: ElementRef) {
    if (typeof window !== 'undefined') {
      this.el.nativeElement.style.cursor = 'grab';
    }
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent) {
    if (typeof window === 'undefined') return;
    this.isDown = true;
    this.el.nativeElement.classList.add('active');
    this.el.nativeElement.style.cursor = 'grabbing';
    this.startX = e.pageX - this.el.nativeElement.offsetLeft;
    this.scrollLeft = this.el.nativeElement.scrollLeft;
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (typeof window === 'undefined') return;
    this.isDown = false;
    this.el.nativeElement.classList.remove('active');
    this.el.nativeElement.style.cursor = 'grab';
  }

  @HostListener('mouseup')
  onMouseUp() {
    if (typeof window === 'undefined') return;
    this.isDown = false;
    this.el.nativeElement.classList.remove('active');
    this.el.nativeElement.style.cursor = 'grab';
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (typeof window === 'undefined' || !this.isDown) return;
    e.preventDefault();
    const x = e.pageX - this.el.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 2; // Scroll-fast
    this.el.nativeElement.scrollLeft = this.scrollLeft - walk;
  }
}
