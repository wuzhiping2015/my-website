<template>
  <div id="container">
    <div id="gui">
      <div ref="info">加载模型中...</div>
      <el-collapse v-model="activeNames">
        <el-collapse-item title="选择模型" name="1">
          <!-- {{ meshNameIndex }} -->
          <el-button :disabled="modelLoading" @click="handleModelButtonClick(0)"
            >船体模型</el-button
          >
          <!-- <el-button :disabled="modelLoading" @click="handleModelButtonClick(1)"
            >模型2</el-button
          >
          <el-button :disabled="modelLoading" @click="handleModelButtonClick(2)"
            >模型3</el-button
          >
          <el-button :disabled="modelLoading" @click="handleModelButtonClick(3)"
            >模型4</el-button
          >
          <el-button :disabled="modelLoading" @click="handleModelButtonClick(4)"
            >模型5</el-button
          > -->
        </el-collapse-item>
        <el-collapse-item title="部件列表" name="2">
          <el-input
            v-model="searchText"
            placeholder="搜索部件名称..."
            size="small"
            clearable
            style="margin-bottom: 8px"
          />
          <el-button
            size="small"
            style="margin-bottom: 8px"
            @click="restoreAllMeshes"
            :disabled="selectedMeshes.length === 0"
            >一键还原所有部件</el-button
          >

          <el-button @click="resetCamera"  size="small">重置视角</el-button>

          <div
            v-if="filteredSubMeshes.length === 0"
            style="color: #aaa; text-align: center"
          >
            暂无可用部件
          </div>
          <div
            v-for="item in filteredSubMeshes"
            :key="item.uuid"
            class="submesh-list-item"
            :class="{
              active: selectedMeshes.includes(item),
              hovered: hoveredMesh === item,
            }"
            @mouseenter="handleMeshHover(item)"
            @mouseleave="handleMeshHover(null)"
            @click="handleMeshSelectFromList(item, $event)"
          >
            <span>{{ item.name || "未命名部件" }}</span>
          </div>
        </el-collapse-item>
        <!-- <el-collapse-item title="模型控制" name="3">
          <div class="model-controls"></div>
        </el-collapse-item> -->
      </el-collapse>
    </div>
    <div v-if="showDetailPanel && selectedMesh" class="info-panel">
      <div class="info-panel-header">
        <span>部件详情</span>
        <el-button
          icon="el-icon-close"
          size="mini"
          circle
          @click="showDetailPanel = false"
          style="float: right"
        />
      </div>
      <div class="info-panel-body">
        <p><b>名称：</b>{{ selectedMesh.name || "未命名部件" }}</p>
        <p><b>材质：</b>{{ selectedMesh.material?.type || "未知" }}</p>
        <p>
          <b>位置：</b>X: {{ selectedMesh.position.x.toFixed(2) }} Y:
          {{ selectedMesh.position.y.toFixed(2) }} Z:
          {{ selectedMesh.position.z.toFixed(2) }}
        </p>
        <p>
          <b>尺寸：</b>
          <span v-if="selectedMesh.geometry">
            {{ getMeshSize(selectedMesh).x.toFixed(2) }} ×
            {{ getMeshSize(selectedMesh).y.toFixed(2) }} ×
            {{ getMeshSize(selectedMesh).z.toFixed(2) }}
          </span>
          <span v-else>未知</span>
        </p>
      </div>
      <div v-if="decomposedMesh" class="info-panel-footer">
        <el-button size="small" @click="restoreMesh(decomposedMesh)"
          >还原部件</el-button
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, shallowRef, computed } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const meshNameIndex = ref(0);
const activeNames = ref(["1", "2", "3"]);
const info = ref(null);
const modelLoading = ref(false);
const searchText = ref("");
const subMeshes = shallowRef([]); // 所有部件Mesh
const selectedMeshes = ref([]); // 支持多选
const selectedMesh = ref(null); // 当前选中部件
const hoveredMesh = ref(null); // 当前悬停部件
const showDetailPanel = ref(false);
const decomposedMesh = ref(null); // 当前拆解的部件

const data = {
  scene: new THREE.Scene(),
  camera: null,
  orbitControls: null,
  meshNameList: [
    "6.gltf",
    "阀门.gltf",
    "阀门红色材质.gltf",
    "阀门2.gltf",
    "K60发电机.gltf",
  ],
  mesh: null,
  gltfLoader: new GLTFLoader(),
  fBXLoader: new FBXLoader(),
  box: new THREE.Box3(),
  center: new THREE.Vector3(),
  dis: 0,
};

const filteredSubMeshes = computed(() => {
  if (!searchText.value) return subMeshes.value;
  return subMeshes.value.filter((m) =>
    (m.name || "").toLowerCase().includes(searchText.value.toLowerCase())
  );
});

// 高亮材质缓存
const meshOriginalMaterialMap = new WeakMap();
const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xff8800 });

onMounted(() => {
  const container = document.getElementById("container");

  // 设置场景
  data.scene.background = new THREE.Color(0xeeeeee); // 更柔和的浅灰色背景
  const width = container.clientWidth;
  const height = container.clientHeight;

  // 添加环境光和主光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  data.scene.add(ambientLight, directionalLight);

  // 设置相机
  data.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  data.camera.position.set(10, 10, 10);
  data.camera.lookAt(0, 0, 0);

  // 设置渲染器
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 设置轨道控制器
  data.orbitControls = new OrbitControls(data.camera, renderer.domElement);
  data.orbitControls.enableDamping = true;
  data.orbitControls.dampingFactor = 0.05;
  data.orbitControls.screenSpacePanning = true;
  data.orbitControls.minDistance = 5;
  data.orbitControls.maxDistance = 50;
  data.orbitControls.maxPolarAngle = Math.PI / 2;
  data.orbitControls.target.set(0, 0, 0);

  try {
    loadMesh();
  } catch (err) {
    console.error("初始加载模型失败", err);
    if (info.value) {
      info.value.innerHTML =
        '<span style="color: #f22">初始加载失败，将显示默认模型</span>';
    }
    createDefaultMesh();
  }

  // 响应窗口伸缩
  window.onresize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    data.camera.aspect = width / height;
    data.camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  };

  // 3D场景点击拾取
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  renderer.domElement.addEventListener("pointerdown", (event) => {
    // 只处理主键点击
    if (event.button !== 0) return;
    mouse.x = (event.offsetX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.offsetY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, data.camera);
    const intersects = raycaster.intersectObjects(subMeshes.value, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      // 多选支持（Ctrl/Shift）
      if (event.ctrlKey || event.shiftKey) {
        if (!selectedMeshes.value.includes(mesh)) {
          selectedMeshes.value.push(mesh);
          handleMeshSelectMulti(mesh);
        } else {
          // 再次点击取消选中
          selectedMeshes.value = selectedMeshes.value.filter((m) => m !== mesh);
          restoreMesh(mesh);
          if (meshOriginalMaterialMap.has(mesh))
            mesh.material = meshOriginalMaterialMap.get(mesh);
        }
      } else {
        // 单选
        selectedMeshes.value.forEach((m) => {
          restoreMesh(m);
          if (meshOriginalMaterialMap.has(m))
            m.material = meshOriginalMaterialMap.get(m);
        });
        selectedMeshes.value = [mesh];
        handleMeshSelect(mesh);
      }
    }
  });

  // 渲染循环
  function animate() {
    requestAnimationFrame(animate);
    data.orbitControls.update();
    renderer.render(data.scene, data.camera);
  }
  animate();
});

// 加载模型
function loadMesh() {
  if (modelLoading.value) {
    console.warn("模型正在加载中，请稍后再试");
    return;
  }

  if (
    meshNameIndex.value < 0 ||
    meshNameIndex.value >= data.meshNameList.length
  ) {
    console.error("无效的模型索引:", meshNameIndex.value);
    return;
  }

  let name = data.meshNameList[meshNameIndex.value];
  if (!name) {
    console.error("模型名称为空");
    return;
  }

  if (info.value) {
    info.value.innerHTML = "开始加载模型: " + name;
  }

  modelLoading.value = true;

  // 修改模型路径
  let modelPath = `/${name}`;
  let loader = name.endsWith(".fbx") ? data.fBXLoader : data.gltfLoader;

  loader.load(
    modelPath,
    (res) => {
      try {
        if (!res) {
          throw new Error("加载结果为空");
        }

        const group = res.isObject3D ? res : res.scene;
        if (!group) {
          throw new Error("无法获取有效的模型组");
        }

        // 计算模型尺寸和位置
        const box = new THREE.Box3().setFromObject(group);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        // 计算合适的缩放比例
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 10 / maxDim : 1;

        // 设置模型变换
        group.scale.setScalar(scale);
        group.position.copy(center).multiplyScalar(-scale);

        // 添加到场景
        if (data.mesh) {
          data.scene.remove(data.mesh);
          disposeModel(data.mesh);
        }

        data.mesh = group;
        data.scene.add(group);

        // 居中模型
        group.position.sub(center);

        // 收集所有Mesh部件
        collectSubMeshes(group);

        // 更新相机位置以适应模型
        const distance = maxDim * 2;
        data.camera.position.set(distance, distance, distance);
        data.camera.lookAt(0, 0, 0);
        data.orbitControls.target.set(0, 0, 0);
        data.orbitControls.update();

        if (info.value) {
          info.value.innerHTML = "模型加载完成: " + name;
        }

        modelLoading.value = false;
      } catch (err) {
        console.error("处理模型时出错:", err);
        modelLoading.value = false;
        createDefaultMesh();
      }
    },
    (xhr) => {
      if (!info.value) return;
      const progress = xhr.total
        ? Math.floor((xhr.loaded / xhr.total) * 100)
        : 0;
      info.value.innerHTML =
        progress >= 100 ? "处理模型中..." : progress + "% 已加载";
    },
    (err) => {
      console.error("模型加载失败", err);
      modelLoading.value = false;
      createDefaultMesh();
    }
  );
}

// 递归收集所有Mesh部件
function collectSubMeshes(object) {
  const meshes = [];
  object.traverse((child) => {
    if (child.isMesh) {
      meshes.push(child);
    }
  });
  subMeshes.value = meshes;
}

// 处理点击模型按钮事件
function handleModelButtonClick(index) {
  if (modelLoading.value) {
    if (info.value) {
      info.value.innerHTML =
        '<span style="color: #f22">请等待当前模型加载完成</span>';
    }
    return;
  }
  meshNameIndex.value = index;
}

// 备份当前resetCamera实现
const resetCameraBackup = resetCamera;

// 新重置视角逻辑：重新加载当前模型
function resetCamera() {
  // 还原所有部件
  restoreAllMeshes();
  // 重新加载当前模型
  loadMesh();
}

// 释放模型资源
function disposeModel(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}

// 更新模型位置
function updateModelPosition(group) {
  data.box.setFromObject(group);
  data.dis = data.box.max.distanceTo(data.box.min);
  data.box.getCenter(data.center);

  data.camera.far = data.dis * 2;
  data.camera.updateProjectionMatrix();

  data.camera.position.set(
    data.center.x,
    data.center.y,
    data.center.z + data.dis
  );
  data.orbitControls.target.copy(data.center);
  data.orbitControls.update();
}

// 列表悬停/点击事件
function handleMeshHover(mesh) {
  // 先还原上一个高亮
  if (hoveredMesh.value && meshOriginalMaterialMap.has(hoveredMesh.value)) {
    hoveredMesh.value.material = meshOriginalMaterialMap.get(hoveredMesh.value);
  }
  hoveredMesh.value = mesh;
  // 设置高亮
  if (mesh && mesh.isMesh) {
    if (!meshOriginalMaterialMap.has(mesh)) {
      meshOriginalMaterialMap.set(mesh, mesh.material);
    }
    mesh.material = highlightMaterial;
  }
}

// 平滑相机聚焦到目标Mesh
function focusCameraOnMesh(mesh) {
  if (!mesh) return;
  // 计算包围盒中心和尺寸
  const box = new THREE.Box3().setFromObject(mesh);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  // 计算目标相机距离
  const fitOffset = 1.5;
  const distance =
    (maxDim * fitOffset) / Math.tan((data.camera.fov * Math.PI) / 360);
  // 目标相机位置（保持当前视角方向）
  const direction = data.camera.position
    .clone()
    .sub(data.orbitControls.target)
    .normalize();
  const newCamPos = center.clone().add(direction.multiplyScalar(distance));

  // 动画插值参数
  const startPos = data.camera.position.clone();
  const startTarget = data.orbitControls.target.clone();
  const endPos = newCamPos;
  const endTarget = center;
  let t = 0;
  const duration = 0.8; // 秒
  const animateFocus = () => {
    t += 1 / 60 / duration;
    if (t > 1) t = 1;
    // 插值
    data.camera.position.lerpVectors(startPos, endPos, t);
    data.orbitControls.target.lerpVectors(startTarget, endTarget, t);
    data.orbitControls.update();
    if (t < 1) {
      requestAnimationFrame(animateFocus);
    }
  };
  animateFocus();
}

// 拆解部件动画
function decomposeMesh(mesh) {
  if (!mesh) return;
  // 记录原始位置
  if (!mesh.position_0) mesh.position_0 = mesh.position.clone();
  // 计算拆解方向（远离模型中心）
  const box = new THREE.Box3().setFromObject(mesh);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const modelCenter = new THREE.Vector3();
  data.box.setFromObject(data.mesh);
  data.box.getCenter(modelCenter);
  const direction = center.clone().sub(modelCenter).normalize();
  const offset = direction.multiplyScalar(2.5); // 拆解距离
  const start = mesh.position.clone();
  const end = mesh.position_0.clone().add(offset);
  let t = 0;
  const duration = 0.6;
  function animate() {
    t += 1 / 60 / duration;
    if (t > 1) t = 1;
    mesh.position.lerpVectors(start, end, t);
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      decomposedMesh.value = mesh;
    }
  }
  animate();
}

// 还原部件动画
function restoreMesh(mesh) {
  if (!mesh || !mesh.position_0) return;
  const start = mesh.position.clone();
  const end = mesh.position_0.clone();
  let t = 0;
  const duration = 0.6;
  function animate() {
    t += 1 / 60 / duration;
    if (t > 1) t = 1;
    mesh.position.lerpVectors(start, end, t);
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      decomposedMesh.value = null;
    }
  }
  animate();
}

// 多选高亮与拆解
function handleMeshSelectMulti(mesh) {
  // 拆解
  decomposeMesh(mesh);
  // 列表同步高亮
  selectedMesh.value = mesh;
  showDetailPanel.value = true;
}

// 一键还原所有部件
function restoreAllMeshes() {
  selectedMeshes.value.forEach((mesh) => {
    restoreMesh(mesh);
    if (meshOriginalMaterialMap.has(mesh))
      mesh.material = meshOriginalMaterialMap.get(mesh);
  });
  selectedMeshes.value = [];
  selectedMesh.value = null;
  decomposedMesh.value = null;
  showDetailPanel.value = false;
}

function handleMeshSelect(mesh) {
  // 还原所有已选部件
  selectedMeshes.value.forEach((m) => {
    restoreMesh(m);
    if (meshOriginalMaterialMap.has(m)) m.material = meshOriginalMaterialMap.get(m);
  });
  selectedMeshes.value = [mesh];
  selectedMesh.value = mesh;
  // 弹出详情面板
  showDetailPanel.value = true;
  // 相机平滑聚焦
  focusCameraOnMesh(mesh);
  // 拆解部件
  decomposeMesh(mesh);
}

// 列表点击多选支持
function handleMeshSelectFromList(mesh, event) {
  if (event && (event.ctrlKey || event.shiftKey)) {
    if (!selectedMeshes.value.includes(mesh)) {
      selectedMeshes.value.push(mesh);
      handleMeshSelectMulti(mesh);
    } else {
      selectedMeshes.value = selectedMeshes.value.filter((m) => m !== mesh);
      restoreMesh(mesh);
      if (meshOriginalMaterialMap.has(mesh))
        mesh.material = meshOriginalMaterialMap.get(mesh);
    }
  } else {
    handleMeshSelect(mesh);
  }
}

// 获取Mesh尺寸
function getMeshSize(mesh) {
  if (!mesh.geometry) return { x: 0, y: 0, z: 0 };
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}

// 鼠标离开canvas时还原高亮
const container = document.getElementById("container");
if (container) {
  container.addEventListener("mouseleave", () => {
    if (hoveredMesh.value && meshOriginalMaterialMap.has(hoveredMesh.value)) {
      hoveredMesh.value.material = meshOriginalMaterialMap.get(
        hoveredMesh.value
      );
      hoveredMesh.value = null;
    }
  });
}
</script>

<style scoped>
#container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #f0f0f0;
}

#gui {
  position: absolute;
  background: rgba(255, 255, 255, 0.9);
  padding: 0 1rem;
  height: 100%;
  overflow-y: auto;
  z-index: 1;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.info-panel {
  position: absolute;
  top: 30px;
  right: 30px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  padding: 18px 22px 12px 22px;
  min-width: 260px;
  z-index: 10;
  font-size: 15px;
}
.info-panel-header {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.info-panel-body p {
  margin: 8px 0;
  color: #444;
}
.info-panel-footer {
  margin-top: 12px;
  text-align: right;
}

.submesh-list-item {
  margin: 0;
  padding: 8px 0 8px 8px;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s, color 0.2s;
}
.submesh-list-item.active {
  background: #6af;
  color: #fff;
}
.submesh-list-item.hovered {
  background: #e0f0ff;
  color: #333;
}

.model-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 2;
  display: flex;
  gap: 10px;
}

.model-controls button {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.model-controls button:hover {
  background: #6af;
  color: white;
}
</style>
