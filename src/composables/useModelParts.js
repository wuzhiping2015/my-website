import { ref, computed, markRaw } from 'vue';
import * as THREE from 'three';

export function useModelParts() {
    // 状态变量
    const partsList = ref([]);
    const selectedPart = ref(null);
    const hoveredPart = ref(null);
    const searchQuery = ref('');

    // 原始材质保存 - 用于恢复部件的原始材质
    const originalMaterials = new Map();

    // 高亮材质配置
    const highlightMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x003300,
        metalness: 0.5,
        roughness: 0.5,
        wireframe: false
    });

    // 选中材质配置
    const selectedMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0x333300,
        metalness: 0.5,
        roughness: 0.5,
        wireframe: false
    });

    // 过滤后的部件列表
    const filteredParts = computed(() => {
        if (!searchQuery.value.trim()) {
            return partsList.value;
        }

        const query = searchQuery.value.toLowerCase();
        return partsList.value.filter(part =>
            part.name.toLowerCase().includes(query) ||
            part.type.toLowerCase().includes(query) ||
            (part.description && part.description.toLowerCase().includes(query))
        );
    });

    // 提取模型部件信息
    const extractPartsList = (modelObj) => {
        if (!modelObj) return;

        console.log('开始提取部件信息...');
        // 清空当前部件列表
        partsList.value = [];

        // 遍历模型的所有子对象
        modelObj.traverse((object) => {
            // 只处理网格对象
            if (object instanceof THREE.Mesh) {
                try {
                    // 生成部件名称（如果没有名称，则使用UUID的一部分）
                    const partName = object.name || `部件-${object.uuid.substring(0, 8)}`;
                    const partType = object.userData.type || "模型部件";
                    const partVolume = object.userData.volume || calculateVolume(object.geometry);

                    // 保存原始材质
                    saveOriginalMaterial(object);

                    // 将部件添加到列表中
                    partsList.value.push({
                        id: object.uuid,
                        name: partName,
                        type: partType,
                        materialType: getMaterialType(object.material),
                        dimensions: getObjectDimensions(object),
                        position: object.position.clone(),
                        volume: partVolume,
                        description: object.userData.description || `${partName}是模型的一部分`,
                        object: markRaw(object) // 使用markRaw避免Vue响应式系统处理Three.js对象
                    });

                    // 在网格对象上添加部件ID引用，便于后续查找
                    object.userData.partId = object.uuid;
                } catch (error) {
                    console.error(`处理部件 ${object.name || object.uuid} 时出错:`, error);
                }
            }
        });

        console.log(`部件提取完成，共找到 ${partsList.value.length} 个部件`);
    };

    // 保存原始材质
    const saveOriginalMaterial = (object) => {
        if (!object.material) return;

        if (Array.isArray(object.material)) {
            const materials = object.material.map(mat => mat.clone());
            originalMaterials.set(object.uuid, materials);
        } else {
            originalMaterials.set(object.uuid, object.material.clone());
        }
    };

    // 获取材质类型
    const getMaterialType = (material) => {
        if (!material) return "未知";

        if (Array.isArray(material)) {
            return "多重材质";
        }

        if (material.isMeshStandardMaterial) {
            return "标准材质";
        } else if (material.isMeshPhongMaterial) {
            return "Phong材质";
        } else if (material.isMeshBasicMaterial) {
            return "基础材质";
        } else if (material.isMeshLambertMaterial) {
            return "Lambert材质";
        } else {
            return "其他材质";
        }
    };

    // 获取物体尺寸
    const getObjectDimensions = (object) => {
        if (!object || !object.geometry) {
            return "未知";
        }

        object.geometry.computeBoundingBox();
        const box = object.geometry.boundingBox;
        const width = Math.round((box.max.x - box.min.x) * 100) / 100;
        const height = Math.round((box.max.y - box.min.y) * 100) / 100;
        const depth = Math.round((box.max.z - box.min.z) * 100) / 100;

        return `${width} × ${height} × ${depth}`;
    };

    // 计算几何体体积
    const calculateVolume = (geometry) => {
        if (!geometry) return 0;

        try {
            // 对于BufferGeometry，计算体积
            if (geometry.isBufferGeometry) {
                const position = geometry.attributes.position;
                const faces = position.count / 3;
                let volume = 0;

                for (let i = 0; i < faces; i++) {
                    const index = i * 3;

                    const v0 = new THREE.Vector3(
                        position.getX(index),
                        position.getY(index),
                        position.getZ(index)
                    );

                    const v1 = new THREE.Vector3(
                        position.getX(index + 1),
                        position.getY(index + 1),
                        position.getZ(index + 1)
                    );

                    const v2 = new THREE.Vector3(
                        position.getX(index + 2),
                        position.getY(index + 2),
                        position.getZ(index + 2)
                    );

                    volume += calculateTriangleVolume(v0, v1, v2);
                }

                // 转换为方米并保留3位小数
                volume = Math.round(volume * 1000) / 1000;

                // 返回绝对值（体积应该是正数）
                return Math.abs(volume);
            }

            // 其他几何体类型
            return 0;
        } catch (error) {
            console.error("计算几何体体积出错:", error);
            return 0;
        }
    };

    // 计算三角形体积（相对于原点）
    const calculateTriangleVolume = (v0, v1, v2) => {
        const v01 = new THREE.Vector3().subVectors(v1, v0);
        const v02 = new THREE.Vector3().subVectors(v2, v0);
        const cross = new THREE.Vector3().crossVectors(v01, v02);

        // 体积 = 1/6 * (v0 · (v1 × v2))
        return v0.dot(cross) / 6.0;
    };

    // 选择部件
    const selectPart = (part) => {
        // 移除之前的选择
        if (selectedPart.value && selectedPart.value.object) {
            restoreMaterial(selectedPart.value.object);
        }

        // 设置新的选择
        selectedPart.value = part;

        // 如果有选中部件，应用高亮材质
        if (part && part.object) {
            applyMaterial(part.object, selectedMaterial);
        }
    };

    // 清除选择
    const clearSelectedPart = () => {
        if (selectedPart.value && selectedPart.value.object) {
            restoreMaterial(selectedPart.value.object);
        }
        selectedPart.value = null;
    };

    // 鼠标悬停部件
    const hoverPart = (part) => {
        // 如果部件已经被选中，不应用悬停效果
        if (selectedPart.value && part && selectedPart.value.id === part.id) {
            return;
        }

        // 移除之前的悬停效果
        if (hoveredPart.value && hoveredPart.value.object) {
            restoreMaterial(hoveredPart.value.object);
        }

        // 设置新的悬停
        hoveredPart.value = part;

        // 应用高亮材质
        if (part && part.object) {
            applyMaterial(part.object, highlightMaterial);
        }
    };

    // 清除悬停
    const clearHoveredPart = () => {
        if (hoveredPart.value && hoveredPart.value.object) {
            // 恢复原来的材质（如果不是当前选中的部件）
            if (!selectedPart.value || hoveredPart.value.id !== selectedPart.value.id) {
                restoreMaterial(hoveredPart.value.object);
            }
        }
        hoveredPart.value = null;
    };

    // 应用材质
    const applyMaterial = (object, material) => {
        if (!object || !material) return;

        if (Array.isArray(object.material)) {
            // 对于多材质对象，保存每个材质然后替换
            object.material = object.material.map(() => material.clone());
        } else {
            // 对于单材质对象，直接替换
            object.material = material.clone();
        }
    };

    // 恢复原始材质
    const restoreMaterial = (object) => {
        if (!object) return;

        const id = object.uuid;
        if (originalMaterials.has(id)) {
            const original = originalMaterials.get(id);

            if (Array.isArray(original)) {
                object.material = original.map(mat => mat.clone());
            } else {
                object.material = original.clone();
            }
        }
    };

    // 格式化向量
    const formatVector = (vector) => {
        if (!vector) return "未知";

        const x = Math.round(vector.x * 100) / 100;
        const y = Math.round(vector.y * 100) / 100;
        const z = Math.round(vector.z * 100) / 100;

        return `(${x}, ${y}, ${z})`;
    };

    // 清空部件列表
    const clearPartsList = () => {
        partsList.value = [];
        selectedPart.value = null;
        hoveredPart.value = null;
        originalMaterials.clear();
    };

    return {
        partsList,
        selectedPart,
        hoveredPart,
        searchQuery,
        filteredParts,
        extractPartsList,
        selectPart,
        clearSelectedPart,
        hoverPart,
        clearHoveredPart,
        formatVector,
        clearPartsList
    };
}