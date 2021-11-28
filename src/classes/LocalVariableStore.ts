import { Value } from "types";
import Interpreter from "./Interpreter";

// TODO: Ask Shad about potential issues with count. What happens if a value is deleted? Potential bug.

/**
 * Handles Diannex variables.
 *
 * @private
 */
class LocalVariableStore {
    variables: Record<number, Value>;
    flagMap: Record<number, string>;
    #interpreter: Interpreter;

    get count(): number {
        return (
            Object.keys(this.variables).length +
            Object.keys(this.flagMap).length
        );
    }

    /**
     * Handles Diannex variables.
     *
     * @param interpreter The interpreter to use.
     */
    constructor(interpreter: Interpreter) {
        this.#interpreter = interpreter;
        this.variables = {};
        this.flagMap = {};
    }

    /**
     * Adds a value to the end of the variable register.
     *
     * @param value The new value to add.
     */
    add(value: Value): void {
        this.variables[this.count] = value;
    }

    /**
     * Gets the value of a variable by ID.
     *
     * @param index The ID of the variable to get.
     * @returns The value of the variable.
     */
    get(index: number): Value {
        if (this.flagMap[index]) {
            return this.#interpreter.getFlag(this.flagMap[index]);
        }

        return this.variables[index];
    }

    /**
     * Sets a variable by ID.
     *
     * @param index The ID of the variable to set.
     * @param value The value to set the variable to.
     */
    set(index: number, value: Value): void {
        if (this.flagMap[index]) {
            this.#interpreter.setFlag(this.flagMap[index], value);
        } else {
            this.variables[index] = value;
        }
    }

    /**
     * Removes a variable from the store by ID.
     *
     * @param index The ID of the variable that should be removed.
     */
    delete(index: number): void {
        if (index < Object.keys(this.flagMap).length) {
            delete this.flagMap[index];
        } else if (this.variables[index]) {
            delete this.variables[index];
        }
    }

    /**
     * Clears the entire variable store.
     */
    clear(): void {
        this.variables = {};
    }
}

export default LocalVariableStore;
