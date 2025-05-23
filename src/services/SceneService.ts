import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import Stats from 'stats.js';
import type { SceneConfig, SceneState } from '../types/scene';

export class SceneService {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private outlinePass: OutlinePass;
  private stats: Stats;
  private animationFrame: number;
  private state: SceneState;

  constructor(private config: SceneConfig) {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initPostProcessing();
    this.initStats();
    this.initState();
    this.initEventListeners();
    this.animate();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor || 0x222222);
    
    // 添加基础光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    hemiLight.position.set(0, 20, 0);
    
    this.scene.add(ambientLight, directionalLight, hemiLight);
  }

  private initCamera(): void {
    const { width, height } = this.config;
    this.camera = new THREE.PerspectiveCamera(
      this.config.cameraConfig?.fov || 45,
      width / height,
      this.config.cameraConfig?.near || 0.1,
      this.config.cameraConfig?.far || 2000
    );
    
    const position = this.config.cameraConfig?.position || new THREE.Vector3(10, 10, 10);
    this.camera.position.copy(position);
    this.camera.lookAt(this.config.cameraConfig?.target || new THREE.Vector3(0, 0, 0));
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance"
    });
    
    this.renderer.setSize(this.config.width, this.config.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    
    this.config.container.appendChild(this.renderer.domElement);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, {
      enableDamping: true,
      dampingFactor: 0.05,
      screenSpacePanning: true,
      minDistance: 5,
      maxDistance: 50,
      maxPolarAngle: Math.PI / 2,
      ...this.config.controlsConfig
    });
  }

  private initPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    this.outlinePass = new OutlinePass(
      new THREE.Vector2(this.config.width, this.config.height),
      this.scene,
      this.camera
    );
    this.outlinePass.visibleEdgeColor.setRGB(1, 0.75, 0.2);
    this.outlinePass.edgeGlow = 2.5;
    this.outlinePass.edgeThickness = 5;
    this.outlinePass.pulsePeriod = 2;
    this.composer.addPass(this.outlinePass);
    
    const fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x = 1 / (this.config.width * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y = 1 / (this.config.height * pixelRatio);
    this.composer.addPass(fxaaPass);
  }

  private initStats(): void {
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.config.container.appendChild(this.stats.dom);
  }

  private initState(): void {
    this.state = {
      isLoading: false,
      loadingProgress: 0,
      selectedPart: null,
      annotations: [],
      measurements: [],
      autoRotate: false,
      exploded: false
    };
  }

  private initEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    const { width, height } = this.config.container.getBoundingClientRect();
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  private animate(): void {
    this.stats.begin();
    
    this.controls.update();
    
    if (this.state.autoRotate) {
      this.scene.rotation.y += 0.001;
    }
    
    this.composer.render();
    
    this.stats.end();
    
    this.animationFrame = requestAnimationFrame(this.animate.bind(this));
  }

  public dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.renderer.dispose();
    this.composer.dispose();
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }

  public getState(): SceneState {
    return { ...this.state };
  }

  public setState(newState: Partial<SceneState>): void {
    this.state = { ...this.state, ...newState };
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public setAutoRotate(value: boolean): void {
    this.state.autoRotate = value;
  }

  public highlightObject(object: THREE.Object3D | null): void {
    this.outlinePass.selectedObjects = object ? [object] : [];
  }
} 