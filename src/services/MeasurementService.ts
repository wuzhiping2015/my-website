import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import type { MeasurementData } from '../types/scene';

export class MeasurementService {
  private measurements: Map<string, {
    points: THREE.Vector3[];
    line: THREE.Line;
    label: CSS2DObject;
  }>;
  private scene: THREE.Scene;
  private activeMeasurement: string | null = null;
  private lineMaterial: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.measurements = new Map();
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 2,
      depthTest: false
    });
  }

  public startMeasurement(id: string, type: 'distance' | 'angle' | 'area'): void {
    if (this.activeMeasurement) {
      this.cancelMeasurement();
    }
    
    this.activeMeasurement = id;
    this.measurements.set(id, {
      points: [],
      line: new THREE.Line(new THREE.BufferGeometry(), this.lineMaterial),
      label: this.createLabel('0.00')
    });
    
    const measurement = this.measurements.get(id)!;
    this.scene.add(measurement.line);
    this.scene.add(measurement.label);
  }

  public addPoint(point: THREE.Vector3): void {
    if (!this.activeMeasurement) return;
    
    const measurement = this.measurements.get(this.activeMeasurement)!;
    measurement.points.push(point.clone());
    
    // 更新线条几何体
    const positions = new Float32Array(measurement.points.length * 3);
    measurement.points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    
    measurement.line.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    
    // 更新标签位置和内容
    if (measurement.points.length > 1) {
      const value = this.calculateMeasurement(measurement.points);
      measurement.label.element.textContent = value.toFixed(2);
      
      // 将标签放在线段中点
      const midPoint = new THREE.Vector3();
      midPoint.addVectors(
        measurement.points[0],
        measurement.points[measurement.points.length - 1]
      ).multiplyScalar(0.5);
      measurement.label.position.copy(midPoint);
    }
  }

  private calculateMeasurement(points: THREE.Vector3[]): number {
    if (points.length < 2) return 0;
    
    // 计算距离
    return points[0].distanceTo(points[points.length - 1]);
  }

  private createLabel(text: string): CSS2DObject {
    const div = document.createElement('div');
    div.className = 'measurement-label';
    div.textContent = text;
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    div.style.color = '#ffffff';
    div.style.padding = '4px 8px';
    div.style.borderRadius = '4px';
    div.style.fontSize = '12px';
    
    return new CSS2DObject(div);
  }

  public completeMeasurement(): MeasurementData | null {
    if (!this.activeMeasurement) return null;
    
    const measurement = this.measurements.get(this.activeMeasurement)!;
    const value = this.calculateMeasurement(measurement.points);
    
    const data: MeasurementData = {
      id: this.activeMeasurement,
      type: 'distance',
      points: measurement.points,
      value,
      unit: 'm'
    };
    
    this.activeMeasurement = null;
    return data;
  }

  public cancelMeasurement(): void {
    if (!this.activeMeasurement) return;
    
    const measurement = this.measurements.get(this.activeMeasurement)!;
    this.scene.remove(measurement.line);
    this.scene.remove(measurement.label);
    this.measurements.delete(this.activeMeasurement);
    this.activeMeasurement = null;
  }

  public removeMeasurement(id: string): void {
    const measurement = this.measurements.get(id);
    if (measurement) {
      this.scene.remove(measurement.line);
      this.scene.remove(measurement.label);
      this.measurements.delete(id);
    }
  }

  public updateMeasurementVisibility(visible: boolean): void {
    this.measurements.forEach(measurement => {
      measurement.line.visible = visible;
      measurement.label.visible = visible;
    });
  }

  public dispose(): void {
    this.measurements.forEach(measurement => {
      measurement.line.geometry.dispose();
      (measurement.line.material as THREE.Material).dispose();
      this.scene.remove(measurement.line);
      this.scene.remove(measurement.label);
    });
    this.measurements.clear();
  }

  public getMeasurement(id: string) {
    return this.measurements.get(id);
  }

  public getAllMeasurements(): MeasurementData[] {
    return Array.from(this.measurements.entries()).map(([id, measurement]) => ({
      id,
      type: 'distance',
      points: measurement.points,
      value: this.calculateMeasurement(measurement.points),
      unit: 'm'
    }));
  }
} 