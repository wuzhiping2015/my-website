import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        }
    },
    server: {
        port: 3000,
        host: true,
        open: true,
        fs: {
            strict: false,
            allow: ['..']
        }
    },
    build: {
        worker: {
            format: 'es',
            plugins: () => [vue()],
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    'three-core': ['three'],
                    'three-examples': ['three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/loaders/DRACOLoader.js'],
                },
            },
        },
        assetsInlineLimit: 0,
    },
    optimizeDeps: {
        exclude: ['three/examples/jsm/loaders/DRACOLoader.js'],
        esbuildOptions: {
            target: 'esnext',
        },
    },
    // 添加assetsInclude配置
    assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.obj', '**/*.fbx']
})