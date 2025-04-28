import {Clock} from 'three';

export default class Timer {
  constructor(autoStart = true) {
    this.elapsedTime = 0
    this.clock = new Clock(false)
    this.tasks = []
    this.running = false
    if (autoStart) this.start()
  }
  start() {
    if (!this.running) {
      this.running = true
      this.clock.start()
    }
  }
  tick() {
    let delta = 0;
    if (this.running) {
      delta = this.clock.getDelta()
      this.elapsedTime += delta
      this.tasks.forEach((callback) => {
        if (callback != null) callback(delta, this.elapsedTime);
      });
    }
    return delta;
  }
  addTask(callback) {
    let i = 0;
    for (let task of this.tasks) {
      if (task == null) {
        this.tasks[i] = callback
        return i
      }
      i++
    }
    this.tasks.push(callback)
    return this.tasks.length - 1
  }
  to(property, endValue, duration, linearFunc, onFinish, isReverse, isLoop) {
    let startTime = this.elapsedTime;

    let startValue;
    if (property.isVector3 || property.isColor) {
      startValue = property.clone();
    } else {
      startValue = property.obj[property.key];
    }

    if (linearFunc == 'ease-out') linearFunc = (x) => Math.sin(x * Math.PI / 2)
    
    if (duration == undefined) duration = 1
    let taskId = this.addTask((delta, elapsedTime) => {
      let long = elapsedTime - startTime
      if (long >= duration) { // 动画结束
        if (property.isVector3 || property.isColor) {
          property.copy(endValue)
        } else {
          property.obj[property.key] = endValue
        }
        if (isReverse || isLoop) { // 反转或循环
          startTime = elapsedTime;
        } else {
          this.remove(taskId);
          if (onFinish) onFinish();
        }
        if (isReverse) { // 单次反转，或反转+循环
          if (property.isVector3 || property.isColor) {
            let tmp = startValue.clone();
            startValue = endValue.clone();
            endValue = tmp;
          } else {
            let tmp = startValue;
            startValue = endValue;
            endValue = tmp;
          }
          if (!isLoop) isReverse = false;
        }
      } else { // 动画过程
        let progress = long / duration
        if (linearFunc) progress = linearFunc(progress);
        if (property.isVector3) {
          property.lerpVectors(startValue, endValue, progress)
        } else if (property.isColor) {
          property.lerpColors(startValue, endValue, progress)
        } else {
          property.obj[property.key] = startValue * (1 - progress) + endValue * progress
        }
      }
    })
    return taskId;
  }
  with(callback, duration, onFinish, isLoop) {
    let startTime = this.elapsedTime;
    if (duration == undefined) duration = 1
    let taskId = this.addTask((delta, elapsedTime) => {
      callback()
      if (elapsedTime - startTime >= duration) {
        if (isLoop) {
          startTime = elapsedTime;
        } else {
          this.remove(taskId);
          if (onFinish) onFinish();
        }
      }
    })
    return taskId;
  }
  stop() {
    if (this.running) {
      this.running = false
      this.clock.stop()
    }
  }
  remove(i) {
    if (this.tasks[i]) this.tasks[i] = null
  }
  clear() {
    this.stop()
    this.tasks = []
  }
}