import { defineStore } from 'pinia';
import type { ModelInfo, PartInfo, AnnotationData, MeasurementData } from '../types/scene';

interface ModelState {
  currentModel: ModelInfo | null;
  selectedPart: PartInfo | null;
  annotations: AnnotationData[];
  measurements: MeasurementData[];
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;
  isAutoRotate: boolean;
  isExploded: boolean;
}

export const useModelStore = defineStore('model', {
  state: (): ModelState => ({
    currentModel: null,
    selectedPart: null,
    annotations: [],
    measurements: [],
    isLoading: false,
    loadingProgress: 0,
    error: null,
    isAutoRotate: false,
    isExploded: false
  }),

  getters: {
    hasModel: (state) => state.currentModel !== null,
    hasPart: (state) => state.selectedPart !== null,
    annotationCount: (state) => state.annotations.length,
    measurementCount: (state) => state.measurements.length,
    isReady: (state) => !state.isLoading && !state.error
  },

  actions: {
    setCurrentModel(model: ModelInfo | null) {
      this.currentModel = model;
    },

    setSelectedPart(part: PartInfo | null) {
      this.selectedPart = part;
    },

    addAnnotation(annotation: AnnotationData) {
      this.annotations.push(annotation);
    },

    removeAnnotation(id: string) {
      const index = this.annotations.findIndex(a => a.id === id);
      if (index !== -1) {
        this.annotations.splice(index, 1);
      }
    },

    updateAnnotation(annotation: AnnotationData) {
      const index = this.annotations.findIndex(a => a.id === annotation.id);
      if (index !== -1) {
        this.annotations[index] = annotation;
      }
    },

    addMeasurement(measurement: MeasurementData) {
      this.measurements.push(measurement);
    },

    removeMeasurement(id: string) {
      const index = this.measurements.findIndex(m => m.id === id);
      if (index !== -1) {
        this.measurements.splice(index, 1);
      }
    },

    updateMeasurement(measurement: MeasurementData) {
      const index = this.measurements.findIndex(m => m.id === measurement.id);
      if (index !== -1) {
        this.measurements[index] = measurement;
      }
    },

    setLoading(isLoading: boolean) {
      this.isLoading = isLoading;
      if (!isLoading) {
        this.loadingProgress = 0;
      }
    },

    setLoadingProgress(progress: number) {
      this.loadingProgress = progress;
    },

    setError(error: string | null) {
      this.error = error;
    },

    setAutoRotate(value: boolean) {
      this.isAutoRotate = value;
    },

    setExploded(value: boolean) {
      this.isExploded = value;
    },

    reset() {
      this.currentModel = null;
      this.selectedPart = null;
      this.annotations = [];
      this.measurements = [];
      this.isLoading = false;
      this.loadingProgress = 0;
      this.error = null;
      this.isAutoRotate = false;
      this.isExploded = false;
    }
  }
}); 