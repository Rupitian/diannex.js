import {
    DiannexFunc, Value 
} from "types";

class FunctionHandler {
    #funcs: Record<string, DiannexFunc>;
    
    constructor(funcs: Record<string, DiannexFunc> = {}) {
        this.#funcs = funcs;
    }

    invoke(name: string, args: Value[]): Value {
        if (this.#funcs[name]) {
            return this.#funcs[name](args);
        }

        throw new Error("Invalid function.");
    }

    registerFunction(name: string, func: DiannexFunc): void {
        this.#funcs[name] = func;
    }

    unregisterFunction(name: string): void {
        delete this.#funcs[name];
    }

    clear(): void {
        this.#funcs = {};
    }
}

export default FunctionHandler;