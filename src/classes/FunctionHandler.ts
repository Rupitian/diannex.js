import {
    DiannexFunc, Value 
} from "types";

/**
 * Handles Diannex functions.
 */
class FunctionHandler {
    #funcs: Record<string, DiannexFunc>;

    /**
     * Handles Diannex functions.
     *
     * @param funcs The initial functions to register.
     */
    constructor(funcs: Record<string, DiannexFunc> = {}) {
        this.#funcs = funcs;
    }

    /**
     * Executes a function with certain arguments.
     *
     * @param name The name of the function to execute.
     * @param args The arguments to pass along to the function.
     * @returns The return value of the function.
     */
    invoke(name: string, args: Value[]): Value {
        if (this.#funcs[name]) {
            return this.#funcs[name](args);
        }

        throw new Error("Invalid function.");
    }

    /**
     * Registers a function for runtime execution.
     *
     * @param name The name of the function to register.
     * @param func The function to register.
     */
    registerFunction(name: string, func: DiannexFunc): void {
        this.#funcs[name] = func;
    }

    /**
     * Removes a function from the register.
     *
     * @param name The name of the function to remove.
     */
    unregisterFunction(name: string): void {
        delete this.#funcs[name];
    }

    /**
     * Clears all functions from the register.
     */
    clear(): void {
        this.#funcs = {};
    }
}

export default FunctionHandler;
