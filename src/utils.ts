export const defer = (fn: Function) => setTimeout(fn, 0); 

export const isFun = (val: unknown): val is Function  => typeof val === 'function';

export const isThenable = (val: any): boolean => val !== null && val !== void 0 && isFun(val.then);
