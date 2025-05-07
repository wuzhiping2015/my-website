import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import type { ModelInfo, PartInfo } from '../types/scene';

export class ModelService {
  private gltfLoader: GLTFLoader;
  private fbxLoader: FBXLoader;
  private dracoLoader: DRACOLoader;
  private loadedModels: Map<string, THREE.Group>;
  private parts: Map<string, PartInfo>;

  constructor() {
    this.initLoaders();
    this.loadedModels = new Map();
    this.parts = new Map();
  }

  private initLoaders(): void {
    // 初始化 Draco 解码器
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    
    // 初始化 GLTF 加载器
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    
    // 初始化 FBX 加载器
    this.fbxLoader = new FBXLoader();
  }

  public async loadModel(modelInfo: ModelInfo, onProgress?: (progress: number) => void): Promise<THREE.Group> {
    try {
      // 检查缓存
      if (this.loadedModels.has(modelInfo.id)) {
        return this.loadedModels.get(modelInfo.id)!.clone();
      }

      let model: THREE.Group;

      switch (modelInfo.type) {
        case 'gltf':
          model = await this.loadGLTF(modelInfo.path, onProgress);
          break;
        case 'fbx':
          model = await this.loadFBX(modelInfo.path, onProgress);
          break;
        default:
          throw new Error(`Unsupported model type: ${modelInfo.type}`);
      }

      // 应用变换
      if (modelInfo.position) model.position.copy(modelInfo.position);
      if (modelInfo.rotation) model.rotation.copy(modelInfo.rotation);
      if (modelInfo.scale) model.scale.copy(modelInfo.scale);

      // 优化模型
      this.optimizeModel(model);

      // 缓存模型
      this.loadedModels.set(modelInfo.id, model.clone());

      // 处理部件信息
      this.processParts(model, modelInfo.id);

      return model;
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  private loadGLTF(path: string, onProgress?: (progress: number) => void): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => resolve(gltf.scene),
        (event) => {
          if (onProgress && event.lengthComputable) {
            onProgress(event.loaded / event.total * 100);
          }
        },
        reject
      );
    });
  }

  private loadFBX(path: string, onProgress?: (progress: number) => void): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(
        path,
        resolve,
        (event) => {
          if (onProgress && event.lengthComputable) {
            onProgress(event.loaded / event.total * 100);
          }
        },
        reject
      );
    });
  }

  private optimizeModel(model: THREE.Group): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 优化几何体
        if (child.geometry) {
          child.geometry.computeVertexNormals();
          child.geometry.computeBoundingSphere();
          child.geometry.computeBoundingBox();
        }

        // 优化材质
        if (child.material) {
          child.material.side = THREE.DoubleSide;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      }
    });
  }

  private processParts(model: THREE.Group, modelId: string): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const partInfo: PartInfo = {
          id: `${modelId}_${child.uuid}`,
          name: child.name || `Part_${child.id}`,
          mesh: child,
          originalPosition: child.position.clone(),
          originalColor: child.material instanceof THREE.Material 
            ? new THREE.Color().copy(child.material.color || new THREE.Color())
            : new THREE.Color(),
          properties: {}
        };
        
        this.parts.set(partInfo.id, partInfo);
      }
    });
  }

  public getPart(partId: string): PartInfo | undefined {
    return this.parts.get(partId);
  }

  public getAllParts(): PartInfo[] {
    return Array.from(this.parts.values());
  }

  public highlightPart(partId: string, color: THREE.Color = new THREE.Color(0xffff00)): void {
    const part = this.parts.get(partId);
    if (part && part.mesh.material) {
      if (Array.isArray(part.mesh.material)) {
        part.mesh.material.forEach(mat => {
          mat.color.copy(color);
        });
      } else {
        part.mesh.material.color.copy(color);
      }
    }
  }

  public resetPartColor(partId: string): void {
    const part = this.parts.get(partId);
    if (part && part.mesh.material) {
      if (Array.isArray(part.mesh.material)) {
        part.mesh.material.forEach(mat => {
          mat.color.copy(part.originalColor);
        });
      } else {
        part.mesh.material.color.copy(part.originalColor);
      }
    }
  }

  public explodeParts(distance: number = 1): void {
    this.parts.forEach(part => {
      const direction = part.mesh.position.clone().normalize();
      part.mesh.position.copy(part.originalPosition.clone().add(direction.multiplyScalar(distance)));
    });
  }

  public resetParts(): void {
    this.parts.forEach(part => {
      part.mesh.position.copy(part.originalPosition);
    });
  }

  public dispose(): void {
    this.loadedModels.forEach(model => {
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    
    this.loadedModels.clear();
    this.parts.clear();
    this.dracoLoader.dispose();
  }
} 