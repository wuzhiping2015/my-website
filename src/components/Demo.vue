<template>
  <div id="container">
    <div id="gui">
      <div ref="info">加载模型中...</div>
      <el-collapse v-model="activeNames">
        <el-collapse-item title="选择模型" name="1">
          {{ meshNameIndex }}
          <el-button :disabled="modelLoading" @click="handleModelButtonClick(0)"
            >模型1</el-button
          >
          <el-button :disabled="modelLoading" @click="handleModelButtonClick(1)"
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
          >
        </el-collapse-item>
        <el-collapse-item title="模型自带动画" name="2">
          <el-button
            :disabled="!data.mesh"
            @click="isMixersPlay = !isMixersPlay"
            >{{ isMixersPlay ? "已启用" : "已关闭" }}</el-button
          >
        </el-collapse-item>
        <el-collapse-item title="其他" name="4">
          <p>
            <el-button
              :disabled="!data.mesh || modelLoading"
              v-if="!isMeshDecompose"
              @click="decomposeMesh()"
              >拆解模型</el-button
            >
            <el-button
              :disabled="!data.mesh || modelLoading"
              v-if="isMeshDecompose"
              @click="mergeMesh()"
              >合并模型</el-button
            >
          </p>
          <p>
            <el-button
              :disabled="!data.mesh || modelLoading"
              @click="setColor()"
              >随机颜色</el-button
            >
            <el-button
              :disabled="!data.mesh || modelLoading"
              @click="resetColor()"
              >原始颜色</el-button
            >
          </p>
          <p style="margin: 0">
            <el-button
              :disabled="!data.mesh || modelLoading"
              @click="setVertexColors(!isVertexColors)"
              >{{
                isVertexColors ? "关闭模型顶点颜色" : "启用模型顶点颜色"
              }}</el-button
            >
          </p>
        </el-collapse-item>
        <el-collapse-item title="部件列表" name="5">
          <p v-if="subMeshes.length === 0">暂无可用部件</p>
          <p
            class="submesh"
            v-for="(item, inx) in subMeshes"
            @mouseenter="setSelectedMesh(item)"
            @click="setClickedMesh(item)"
            :key="inx"
          >
            <span>{{ item.name }}</span>
          </p>
        </el-collapse-item>
      </el-collapse>
    </div>
    <el-dialog title="部件信息" v-model="dialogVisible" width="30%">
      <p>name: {{ data.clickedMesh.name }}</p>
      <p>材质: {{ data.clickedMesh.material_0?.type || "无材质信息" }}</p>
    </el-dialog>
  </div>
</template>
<script setup>
/* eslint-disable */
import { onMounted, ref, shallowReactive, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import Timer from "../assets/Timer";

const meshNameIndex = ref(0);
const activeNames = ref(["1", "2", "3", "4", "5"]);
const dialogVisible = ref(false);
const isMixersPlay = ref(true); // 是否开启模型自带动画
const isMeshDecompose = ref(false); // 是否分解模型
const isVertexColors = ref(false); // 是否启用模型顶点颜色
const timer = new Timer();
const subMeshes = shallowReactive([]); // 模型的各个子部件
const info = ref(null);
const modelLoading = ref(false); // 添加模型加载状态

const data = {
  scene: new THREE.Scene(),
  camera: null,
  outlinePass: null, // 高亮特效外框
  orbitControls: null, // 轨道相机控制器
  // 确保模型文件路径正确，使用相对路径或绝对路径
  //   meshNameList: ["cube.glb", "sphere.glb", "torus.glb", "teapot.glb"],
  meshNameList: [
    "STEP203.fbx",
    "PrimaryIonDrive.glb",
    "untitled.gltf",
    "阀门2.gltf",
    "K60发电机.gltf",
  ],
  mesh: null, // 模型
  gltfLoader: new GLTFLoader(), // 模型加载器
  fBXLoader: new FBXLoader(),
  box: new THREE.Box3(), // 模型外包围盒
  center: new THREE.Vector3(), // 模型中心位置
  dis: 0, // 模型对角线尺寸
  mixers: [], // 模型自带动画
  up: new THREE.Vector3(0, 1, 0), // 主光源相对于相机的位置
  clickedMesh: { name: "", material_0: { type: "" } }, // 修复初始数据结构
  texture: null, // 被选中的部件的纹理贴图
};

onMounted(() => {
  const container = document.getElementById("container");
  data.scene.background = drawTexture();
  const width = container.clientWidth;
  const height = container.clientHeight;
  data.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x1a1a1a); // 环境光
  const light = new THREE.PointLight(0xffffff, 0.6);
  light.position.set(0, 10000, 0);
  data.scene.add(ambientLight, light);

  data.orbitControls = new OrbitControls(data.camera, renderer.domElement);

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

  // 后期处理--outlinePass
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(data.scene, data.camera);
  composer.addPass(renderPass);
  const outlinePass = (data.outlinePass = new OutlinePass(
    new THREE.Vector2(width, height),
    data.scene,
    data.camera
  ));
  outlinePass.visibleEdgeColor.setRGB(1, 0.75, 0.2); // 颜色
  outlinePass.edgeGlow = 2.5; // 光粗
  outlinePass.edgeThickness = 5; // 光晕粗
  outlinePass.pulsePeriod = 2; // 闪烁
  composer.addPass(data.outlinePass);

  // 消除锯齿
  const fxaaPass = new ShaderPass(FXAAShader);
  const pixelRatio = renderer.getPixelRatio();
  fxaaPass.material.uniforms["resolution"].value.x = 1 / (width * pixelRatio);
  fxaaPass.material.uniforms["resolution"].value.y = 1 / (height * pixelRatio);
  composer.addPass(fxaaPass);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isMouseMoved = false;
  let isMouseDown = false;
  data.texture = drawTexture("rgb(255, 255, 255)", "rgb(120, 120, 120)");

  // 鼠标移动时的特效
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  function onPointerMove(event) {
    isMouseMoved = true;
    if (event.isPrimary === false || isMouseDown) return;

    mouse.x = (event.offsetX / container.clientWidth) * 2 - 1;
    mouse.y = -(event.offsetY / container.clientHeight) * 2 + 1;

    checkMousePass();
  }
  // 鼠标移动时的特效
  function checkMousePass() {
    raycaster.setFromCamera(mouse, data.camera);
    const intersects = raycaster.intersectObjects(subMeshes, false);
    if (
      intersects.length > 0 &&
      data.outlinePass.selectedObjects[0] !== intersects[0].object
    ) {
      setSelectedMesh(intersects[0].object);
    } else if (
      intersects.length === 0 &&
      data.outlinePass.selectedObjects.length
    ) {
      resetMtl(data.outlinePass.selectedObjects[0]);
      setOpacity(1);
      data.outlinePass.selectedObjects.length = 0;
      info.value.innerHTML = "";
    }
  }

  // 鼠标点击时的特效
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  function onPointerDown(event) {
    isMouseDown = true;
    if (event.isPrimary === false) return;
    isMouseMoved = false;
  }
  function onPointerUp(event) {
    isMouseDown = false;
    if (event.isPrimary === false || isMouseMoved) return;
    mouse.x = (event.offsetX / container.clientWidth) * 2 - 1;
    mouse.y = -(event.offsetY / container.clientHeight) * 2 + 1;

    checkMouseClick();
  }
  // 鼠标点击时的特效
  function checkMouseClick() {
    raycaster.setFromCamera(mouse, data.camera);
    const intersects = raycaster.intersectObjects(subMeshes, false);
    if (intersects.length > 0) {
      console.log(intersects[0]);
      setClickedMesh(intersects[0].object);
    }
  }

  // 持续渲染
  function animate() {
    requestAnimationFrame(animate);

    data.orbitControls.update();
    light.position.copy(data.camera.position.clone().add(data.up));

    let delta = timer.tick();
    if (isMixersPlay.value) {
      for (let mixer of data.mixers) {
        mixer.update(delta);
      }
    }

    let time = Math.abs((timer.elapsedTime % 2.0) - 1.0);
    if (data.outlinePass.selectedObjects[0]) {
      data.outlinePass.selectedObjects[0].material.uniforms.time.value = time;
    }

    // renderer.render( data.scene, data.camera );
    composer.render();
  }
  animate();
});
watch([meshNameIndex], () => {
  loadMesh();
});
// 加载模型
function loadMesh() {
  // 防止重复加载
  if (modelLoading.value) {
    console.warn("模型正在加载中，请稍后再试");
    return;
  }

  // 确保meshNameIndex值在有效范围内
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

  // 显示加载提示
  if (info.value) {
    info.value.innerHTML = "开始加载模型: " + name;
  }

  modelLoading.value = true;

  // 确保加载模型前指定完整路径
  // 注意：需要确保public/models目录存在，并且包含这些模型文件
  let modelPath = `./public/${name}`;
  let loader = name.endsWith(".fbx") ? data.fBXLoader : data.gltfLoader;

  console.log("加载模型:", modelPath);

  // 设置加载超时
  const loadTimeout = setTimeout(() => {
    modelLoading.value = false;
    if (info.value) {
      info.value.innerHTML =
        '<span style="color: #f22">加载超时: ' + name + "</span>";
    }
  }, 30000); // 30秒超时

  loader.load(
    modelPath,
    (res) => {
      try {
        clearTimeout(loadTimeout);
        modelLoading.value = false;
        console.log("模型加载成功:", name);

        // 检查结果是否有效
        if (!res) {
          throw new Error("加载结果为空");
        }

        // 获取模型组
        const group = res.isObject3D ? res : res.scene;
        if (!group) {
          throw new Error("无法获取有效的模型组");
        }

        // 移除历史模型，将新的模型加入到场景中
        if (data.mesh) data.scene.remove(data.mesh);
        isMeshDecompose.value = false;
        data.mesh = group;
        data.scene.add(group);

        // 装载动画
        data.mixers.length = 0;
        let mixer;
        if (res.animations && res.animations.length) {
          for (let clip of res.animations) {
            console.log(clip);
            mixer = new THREE.AnimationMixer(group);
            mixer.clipAction(clip.optimize()).play();
          }
        }
        if (mixer) data.mixers.push(mixer);

        // 将模型的材质改为镜面高光材质
        setMtl(
          new THREE.MeshPhongMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            vertexColors: isVertexColors.value,
          })
        );

        // 计算模型尺寸，中心位置
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

        setTimeout(() => {
          getSubMeshes(); // 递归遍历子模型
        }, 0);

        if (info.value) {
          info.value.innerHTML = "模型加载完成: " + name;
        }
      } catch (err) {
        console.error("处理模型时出错:", err);
        if (info.value) {
          info.value.innerHTML =
            '<span style="color: #f22">处理模型失败: ' + name + "</span>";
        }
        modelLoading.value = false;
        createDefaultMesh(); // 创建默认模型作为备选
      }
    },
    // onProgress回调
    function (xhr) {
      if (!info.value) return;

      const loaded = xhr.total ? Math.floor((xhr.loaded / xhr.total) * 100) : 0;
      info.value.innerHTML =
        loaded >= 100 ? "处理模型中..." : loaded + "% 已加载";
    },
    // onError回调
    function (err) {
      clearTimeout(loadTimeout);
      modelLoading.value = false;
      console.error("模型加载失败", err);
      if (info.value) {
        info.value.innerHTML =
          '<span style="color: #f22">加载失败: ' + name + "</span>";
      }
    }
  );
}
// 递归遍历子模型
function getSubMeshes(mesh) {
  if (!mesh) {
    // 清除历史模型的几何体、材质缓存
    subMeshes.forEach((v) => {
      if (v.geometry) v.geometry.dispose();
      if (v.material) {
        v.material.map = null;
        v.material.dispose();
      }
      if (v.material_0) {
        v.material_0.map = null;
        v.material_0.dispose();
      }
    });
    subMeshes.length = 0;
    if (data.mesh) mesh = data.mesh;
    else return;
  }
  if (mesh.isMesh) {
    subMeshes.push(mesh);
    // 缓存模型初始位置、初始颜色，设置拆解时的方向
    mesh.position_0 = mesh.position.clone();
    mesh.color_0 = mesh.material.color.clone();

    data.box.setFromObject(mesh);
    let center = new THREE.Vector3();
    data.box.getCenter(center);
    let direction = center.sub(data.center);
    mesh.decomposeDirection = direction;
  } else if (mesh.children) {
    mesh.children.forEach((v) => {
      if (v) getSubMeshes(v);
    });
  }
}
// 设置模型材质
function setMtl(mtl, mesh) {
  if (!mesh) {
    if (data.mesh) mesh = data.mesh;
    else return;
  }
  if (mesh.isMesh) {
    let newMtl = mtl.clone();
    let color = mesh.material.color.clone();
    let max = Math.max(color.r, color.g, color.b);
    if (max < 1) {
      color.multiplyScalar(1 / max);
    }
    // newMtl.color.copy(color);
    if (!mesh.material_0) mesh.material_0 = newMtl;
    // 只保留第一次设置的材质
    if (mesh.material !== mesh.material_0) {
      mesh.material.map = null;
      mesh.material.dispose();
    }
    mesh.material = newMtl;
  } else if (mesh.children) {
    mesh.children.forEach((v) => {
      if (v) setMtl(mtl, v);
    });
  }
}
// 还原模型材质
function resetMtl(mesh) {
  if (!mesh) {
    if (data.mesh) mesh = data.mesh;
    else return;
  }
  if (mesh.isMesh && mesh.material_0) {
    mesh.material.map = null;
    mesh.material.dispose();
    mesh.material = mesh.material_0; // 第一次设置的材质
  } else if (mesh.children) {
    mesh.children.forEach((v) => {
      if (v) resetMtl(v);
    });
  }
}
// 设置模型颜色
function setColor(color, mesh) {
  if (!mesh) {
    if (data.mesh) mesh = data.mesh;
    else return;
  }
  if (mesh.isMesh) {
    mesh.material.color.copy(
      color || new THREE.Color(Math.random() * 16777216)
    );
  } else if (mesh.children) {
    mesh.children.forEach((v) => {
      if (v) setColor(color, v);
    });
  }
}
// 还原模型颜色
function resetColor(mesh) {
  if (!mesh) {
    if (data.mesh) mesh = data.mesh;
    else return;
  }
  if (mesh.isMesh && mesh.color_0) {
    mesh.material.color.copy(mesh.color_0);
  } else if (mesh.children) {
    mesh.children.forEach((v) => {
      if (v) resetColor(v);
    });
  }
}
// 设置模型透明度
function setOpacity(value, mesh) {
  if (!mesh) {
    if (data.mesh) mesh = data.mesh;
    else return;
  }
  if (mesh.isMesh) {
    mesh.material.opacity = value;
    if (value < 1) mesh.material.depthWrite = false;
    else mesh.material.depthWrite = true;
  } else if (mesh.children) {
    mesh.children.forEach((v) => {
      if (v) setOpacity(value, v);
    });
  }
}
// 拆解模型
function decomposeMesh() {
  if (data.mesh) {
    isMeshDecompose.value = true;
    let time = 0;
    let itv = setInterval(() => {
      if (time < 10) {
        subMeshes.forEach((v) => {
          v.position.add(v.decomposeDirection);
        });
        time++;
      } else {
        clearInterval(itv);
      }
    }, 50);
  }
}
// 合并模型
function mergeMesh() {
  if (data.mesh) {
    isMeshDecompose.value = false;
    let time = 0;
    let itv = setInterval(() => {
      if (time < 10) {
        subMeshes.forEach((v) => {
          v.position.sub(v.decomposeDirection);
        });
        time++;
      } else {
        subMeshes.forEach((v) => {
          v.position.copy(v.position_0);
        });
        clearInterval(itv);
      }
    }, 50);
  }
}
// 设置模型是否启用顶点颜色
function setVertexColors(isOpen, mesh) {
  if (!mesh) {
    isVertexColors.value = isOpen;
    if (data.mesh) mesh = data.mesh;
    else return;
  }
  if (mesh.isMesh) {
    mesh.material.vertexColors = isOpen;
    mesh.material_0.vertexColors = isOpen;
  } else if (mesh.children) {
    mesh.children.forEach((v) => {
      if (v) setVertexColors(isOpen, v);
    });
  }
}
// 选中某个部件
function setSelectedMesh(mesh) {
  if (data.outlinePass.selectedObjects[0]) {
    // 还原上一个部件
    resetMtl(data.outlinePass.selectedObjects[0]);
    // setOpacity(0.1, data.outlinePass.selectedObjects[0]);
  } else {
    setOpacity(0.1);
  }
  setMtl(
    new THREE.ShaderMaterial({
      uniforms: {
        u_color: {
          value: new THREE.Color(0xff0000),
        },
        time: {
          value: 0,
        },
      },
      // transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
      varying vec2 vUv;
      varying vec3 p;
      void main() {
        vUv = uv;
        p = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
      fragmentShader: `
      precision mediump float; // 降低浮点数精度，有利于提高性能。默认值: highp (32位浮点, 7位小数)
      uniform float time;
      varying vec2 vUv;
      varying vec3 p;
      void main() {
        float x = vUv.x;
        if (x < 0.1) x = abs(p.x) / 2.0;
        float y = vUv.y;
        if (y < 0.1) y = abs(p.y) / 2.0;
        gl_FragColor = vec4(time, x, y, 1.0);
      }`,
    }),
    mesh
  );
  // setOpacity(1, mesh);
  data.outlinePass.selectedObjects[0] = mesh;
  info.value.innerHTML = mesh.name;
}
// 点击某个部件
function setClickedMesh(mesh) {
  data.clickedMesh = mesh;
  dialogVisible.value = true;
}
// 绘制渐变纹理 colors: ['rgba(0, 100, 255, 1)', 'rgb(0, 200, 255)', ...]
function drawTexture(...colors) {
  let canvas = document.createElement("canvas");
  let size = 1000;
  canvas.width = canvas.height = size;
  let ctx = canvas.getContext("2d");

  let v1 = [0, 0];
  let v2 = [0, 1];
  let gradient = ctx.createLinearGradient(
    v1[0] * size,
    v1[1] * size,
    v2[0] * size,
    v2[1] * size
  );
  if (!colors.length) {
    // 没有传参数，默认渐变颜色为天空蓝
    gradient.addColorStop(0, "rgba(50, 150, 255, 1)");
    gradient.addColorStop(0.5, "rgba(100, 150, 200, 1)");
    gradient.addColorStop(1, "rgba(150, 150, 150, 1)");
  } else if (colors.length === 1) {
    // 参数中只有一种颜色时
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[0]);
  } else {
    let step = 1 / (colors.length - 1);
    let progress = 0;
    for (let color of colors) {
      gradient.addColorStop(progress, color);
      progress += step;
    }
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  let texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
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
// 添加创建默认模型的方法
function createDefaultMesh() {
  try {
    // 创建一个简单的立方体作为默认模型
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x3080ff,
      transparent: true,
      side: THREE.DoubleSide,
      vertexColors: isVertexColors.value,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "默认立方体";

    // 移除历史模型，将新的模型加入到场景中
    if (data.mesh) data.scene.remove(data.mesh);
    isMeshDecompose.value = false;
    data.mesh = mesh;
    data.scene.add(mesh);

    // 计算模型尺寸，中心位置
    data.box.setFromObject(mesh);
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

    // 更新子模型列表
    getSubMeshes();

    if (info.value) {
      info.value.innerHTML = "已创建默认模型";
    }

    console.log("创建默认模型成功");
  } catch (err) {
    console.error("创建默认模型失败", err);
  }
}
</script>

<style scoped>
#container {
  width: 100%;
  height: 100%;
}
#gui {
  position: absolute;
  background: white;
  padding: 0 1rem;
  height: 100%;
  overflow-y: auto;
}
.submesh {
  margin: 0;
  padding: 10px 0;
  text-align: center;
}
.submesh:hover {
  background-color: #6af;
}
</style>
