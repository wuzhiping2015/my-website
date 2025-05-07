import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import type { AnnotationData } from '../types/scene';

export class AnnotationService {
  private labelRenderer: CSS2DRenderer;
  private annotations: Map<string, CSS2DObject>;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.annotations = new Map();
    this.initRenderer();
  }

  private initRenderer(): void {
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);
  }

  public createAnnotation(data: AnnotationData): CSS2DObject {
    // 创建HTML元素
    const annotationElement = document.createElement('div');
    annotationElement.className = 'annotation-label';
    annotationElement.style.backgroundColor = this.getBackgroundColor(data.type);
    annotationElement.style.padding = '5px 10px';
    annotationElement.style.borderRadius = '4px';
    annotationElement.style.color = '#ffffff';
    annotationElement.style.fontSize = '12px';
    annotationElement.style.pointerEvents = 'auto';
    annotationElement.style.cursor = 'pointer';
    
    // 创建标题
    const titleElement = document.createElement('div');
    titleElement.textContent = data.content;
    titleElement.style.fontWeight = 'bold';
    annotationElement.appendChild(titleElement);
    
    // 创建详情
    const detailsElement = document.createElement('div');
    detailsElement.style.fontSize = '10px';
    detailsElement.textContent = `${data.author} - ${this.formatDate(data.created)}`;
    annotationElement.appendChild(detailsElement);

    // 创建CSS2DObject
    const label = new CSS2DObject(annotationElement);
    label.position.copy(data.position);
    
    // 存储标注
    this.annotations.set(data.id, label);
    
    // 添加事件监听
    annotationElement.addEventListener('click', () => {
      this.onAnnotationClick(data);
    });
    
    return label;
  }

  private getBackgroundColor(type: 'info' | 'warning' | 'error'): string {
    switch (type) {
      case 'info':
        return 'rgba(33, 150, 243, 0.9)';
      case 'warning':
        return 'rgba(255, 152, 0, 0.9)';
      case 'error':
        return 'rgba(244, 67, 54, 0.9)';
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private onAnnotationClick(data: AnnotationData): void {
    // 创建详情弹窗
    const modal = document.createElement('div');
    modal.className = 'annotation-modal';
    modal.innerHTML = `
      <div class="annotation-modal-content">
        <h3>${data.content}</h3>
        <p>类型: ${data.type}</p>
        <p>创建者: ${data.author}</p>
        <p>创建时间: ${this.formatDate(data.created)}</p>
        <button onclick="this.parentElement.parentElement.remove()">关闭</button>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  public updateAnnotation(data: AnnotationData): void {
    const label = this.annotations.get(data.id);
    if (label) {
      label.position.copy(data.position);
      const element = label.element as HTMLElement;
      element.querySelector('div')!.textContent = data.content;
    }
  }

  public removeAnnotation(id: string): void {
    const label = this.annotations.get(id);
    if (label) {
      label.removeFromParent();
      this.annotations.delete(id);
    }
  }

  public render(camera: THREE.Camera): void {
    this.labelRenderer.render(camera.parent!, camera);
  }

  public onResize(): void {
    this.labelRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  public dispose(): void {
    this.annotations.forEach(label => {
      label.removeFromParent();
    });
    this.annotations.clear();
    this.container.removeChild(this.labelRenderer.domElement);
  }

  public getAnnotation(id: string): CSS2DObject | undefined {
    return this.annotations.get(id);
  }

  public getAllAnnotations(): CSS2DObject[] {
    return Array.from(this.annotations.values());
  }
} 