/**
 * @typedef {Object} SceneConfig
 * @property {HTMLElement} container
 * @property {number} width
 * @property {number} height
 * @property {number} [backgroundColor]
 * @property {CameraConfig} [cameraConfig]
 * @property {ControlsConfig} [controlsConfig]
 */
/**
 * @typedef {Object} CameraConfig
 * @property {number} [fov]
 * @property {number} [near]
 * @property {number} [far]
 * @property {THREE.Vector3} [position]
 * @property {THREE.Vector3} [target]
 */
/**
 * @typedef {Object} ControlsConfig
 * @property {boolean} [enableDamping]
 * @property {number} [dampingFactor]
 * @property {number} [minDistance]
 * @property {number} [maxDistance]
 * @property {number} [maxPolarAngle]
 */
/**
 * @typedef {Object} ModelInfo
 * @property {string} id
 * @property {string} name
 * @property {'gltf'|'fbx'|'obj'} type
 * @property {string} path
 * @property {THREE.Vector3} [position]
 * @property {THREE.Euler} [rotation]
 * @property {THREE.Vector3} [scale]
 */
/**
 * @typedef {Object} AnnotationData
 * @property {string} id
 * @property {THREE.Vector3} position
 * @property {string} content
 * @property {'info'|'warning'|'error'} type
 * @property {Date} created
 * @property {string} author
 */
/**
 * @typedef {Object} MeasurementData
 * @property {string} id
 * @property {'distance'|'angle'|'area'} type
 * @property {THREE.Vector3[]} points
 * @property {number} value
 * @property {string} unit
 */
/**
 * @typedef {Object} PartInfo
 * @property {string} id
 * @property {string} name
 * @property {THREE.Mesh} mesh
 * @property {THREE.Vector3} originalPosition
 * @property {THREE.Color} originalColor
 * @property {Object} properties
 */
/**
 * @typedef {Object} SceneState
 * @property {boolean} isLoading
 * @property {number} loadingProgress
 * @property {PartInfo|null} selectedPart
 * @property {AnnotationData[]} annotations
 * @property {MeasurementData[]} measurements
 * @property {boolean} autoRotate
 * @property {boolean} exploded
 */