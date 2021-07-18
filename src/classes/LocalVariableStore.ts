import { Value } from "types";
import Interpreter from "./Interpreter";

class LocalVariableStore {
    variables: Record<number, Value>;
    flagMap: Record<number, string>;
    #interpreter: Interpreter;

    get count(): number {
        return Object.keys(this.variables).length + Object.keys(this.flagMap).length;
    }

    constructor(interpreter: Interpreter) {
        this.#interpreter = interpreter;
    }

    add(value: Value): void {
        this.variables[this.count] = value;
    }

    get(index: number): Value {
        if (this.flagMap[index]) {
            return this.#interpreter.getFlag(this.flagMap[index]);
        }

        return this.variables[index];
    }

    set(index: number, value: Value): void {
        if (this.flagMap[index]) {
            this.#interpreter.setFlag(this.flagMap[index], value);
        } else {
            this.variables[index] = value;
        }
    }

    delete(index: number): void {
        if (index < Object.keys(this.flagMap).length) {
            delete this.flagMap[index];
        } else if (this.variables[index]) {
            delete this.variables[index];
        }
    }

    clear(): void {
        this.variables = {};
    }
}

export default LocalVariableStore;