import * as THREE from 'three';

export interface SceneConfig {
  container: HTMLElement;
  width: number;
  height: number;
  backgroundColor?: number;
  cameraConfig?: CameraConfig;
  controlsConfig?: ControlsConfig;
}

export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  position?: THREE.Vector3;
  target?: THREE.Vector3;
}

export interface ControlsConfig {
  enableDamping?: boolean;
  dampingFactor?: number;
  minDistance?: number;
  maxDistance?: number;
  maxPolarAngle?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  type: 'gltf' | 'fbx' | 'obj';
  path: string;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
}

export interface AnnotationData {
  id: string;
  position: THREE.Vector3;
  content: string;
  type: 'info' | 'warning' | 'error';
  created: Date;
  author: string;
}

export interface MeasurementData {
  id: string;
  type: 'distance' | 'angle' | 'area';
  points: THREE.Vector3[];
  value: number;
  unit: string;
}

export interface PartInfo {
  id: string;
  name: string;
  mesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalColor: THREE.Color;
  properties: Record<string, any>;
}

export interface SceneState {
  isLoading: boolean;
  loadingProgress: number;
  selectedPart: PartInfo | null;
  annotations: AnnotationData[];
  measurements: MeasurementData[];
  autoRotate: boolean;
  exploded: boolean;
} 