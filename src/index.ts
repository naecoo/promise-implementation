import { defer, isFun, isThenable } from './utils';

type FutureState = 'pending' | 'fulfilled' | 'rejected';

type FutureConstructorFunction = (resolve: Function, rejected: Function) => void;

export default class Future {
  private state: FutureState;
  private value: any;
  private reason: any;
  private onFulfilledCallbacks: Function[] = [];
  private onRejectedCallbacks: Function[] = [];

  private resolveCallback(instance: Future, result: any, resolve: Function, reject: Function) {
    let called = false;
    try {
      if (instance === result) {
        return reject(new TypeError('Chaining cycle detected for promise'));
      }
      // 类promise
      if (isThenable(result)) {
        // 绑定引用
        const then = result.then;
        then.call(result, (value: any) => {
          if (called) return;
          called = true;
          // 递归处理
          if (isThenable(value)) {
            called = true;
            this.resolveCallback(instance, value, resolve, reject);
          } else {
            resolve(value);
          }
        }, (reason: any) => {
          if (called) return;
          called = true;
          reject(reason);
        });
      } else {
        // 普通数据
        if (called) return;
        called = true;
        resolve(result);
      }
    } catch (error) {
      // 拦截到错误
      if (called) return;
      called = true;
      reject(error);
    }
  }

  constructor(fn: FutureConstructorFunction) {
    if (!isFun(fn)) {
      throw new Error(`Future resolver ${Object.prototype.toString.call(fn)} is not a function`);
    }

    this.state = 'pending';
    this.value = undefined;
    this.reason = undefined;

    const resolve = (value: unknown) => {
      if (this.state !== 'pending') return;
      this.state = 'fulfilled';
      this.value = value;
      this.onFulfilledCallbacks.forEach(fn => fn());
      this.onFulfilledCallbacks = [];
    };
    const reject = (reason: unknown) => {
      if (this.state !== 'pending') return;
      this.state = 'rejected';
      this.reason = reason;
      this.onRejectedCallbacks.forEach(fn => fn());
      this.onRejectedCallbacks = [];
    };

    try {
      fn(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  then(onFulfilled?: Function, onRejected?: Function) {
    if (!isFun(onFulfilled)) {
      onFulfilled = (value: any) => value;
    }
    if (!isFun(onRejected)) {
      onRejected = (reason: any) => { throw reason };
    }

    // 同时还有获取then执行的值
    const newFuture = new Future((resolve, reject) => {

      const onFulfilledCallback = () => defer(() => {
        try {
          const result = onFulfilled!(this.value);
          this.resolveCallback(this, result, resolve, reject);
        } catch (error) {
          reject(error);
        }
      });

      const onRejectedCallback = () => defer(() => {
        try {
          const reason = onRejected!(this.reason);
          this.resolveCallback(this, reason, resolve, reject);
        } catch (error) {
          reject(error);
        }
      });

      if (this.state === 'pending') {
        // 存储
        this.onFulfilledCallbacks.push(onFulfilledCallback);
        this.onRejectedCallbacks.push(onRejectedCallback);
      }

      if (this.state === 'fulfilled') {
        onFulfilledCallback();
      }

      if (this.state === 'rejected') {
        onRejectedCallback();
      }
    });

    return newFuture;
  }

  catch(onRejected: Function) {
    this.then(undefined, onRejected);
  }

  finally(callback: Function) {
    return this.then((value: any) => {
      return Promise.resolve(callback()).then(() => value);
    }, (reason: any) => {
      return Promise.reject(callback()).then(() => {
        throw reason;
      });
    });
  }

  static all(arr: Future[]) {
    const result: any[] = [];
    return new Future((resolve, reject) => {
      if (!arr.length) {
        resolve(result);
      }
      arr.forEach((item, index) => {
        item.then((value: any) => {
          result.push(value);
          if (result.length === arr.length) {
            resolve(result);
          }
        }, reject);
      });
    });
  }

  static race(arr: Future[]) {
    return new Future((resolve, reject) => {
      arr.forEach((item) => {
        item.then(resolve, reject);
      });
    })
  }

  static allSettled(arr: Future) {
    return new Future((resolve, reject) => {
      const arr: any[] = [];
      try {
        const processData = (data: any) => {
          arr.push(data);
          if (arr.length === arr.length) {
            resolve(arr);
          }
          arr.forEach((item) => {
            item.then((value: any) => processData({ state: 'fulfilled', value }), (reason: any) => processData({ state: 'rejected', reason }));
          });
        }
        if (!arr.length) {
          resolve(arr);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  static resolve(val?: unknown) {
    return new Future((resolve) => {
      resolve(val);
    });
  }

  static reject(val?: unknown) {
    return new Future((_, reject) => {
      reject(val);
    });
  }
}
