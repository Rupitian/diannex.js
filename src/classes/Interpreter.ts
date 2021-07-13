import * as fs from "fs";

import Opcode from "enums/Opcode";
import Definition from "types/Definition";
import Value from "types/Value";
import Binary from "./Binary";
import FunctionHandler from "./FunctionHandler";
import LocalVariableStore from "./LocalVariableStore";

type ChanceHandler = (chance: number) => boolean;
type WeightedChanceHandler = (chance: number[]) => number;

class Interpreter {
    binary: Binary;
    functionHandler: FunctionHandler;
    globalVariableStore: Record<string, Value>;
    flags: Record<string, Value>;

    chanceCallback: ChanceHandler;
    weightedChanceCallback: WeightedChanceHandler;
    
    #inChoice: boolean;
    get inChoice(): boolean {
        return this.#inChoice;
    }

    #selectChoice: boolean;
    get selectChoice(): boolean {
        return this.#selectChoice;
    }

    #runningText: boolean;
    get runningText(): boolean {
        return this.#runningText;
    }

    #paused: boolean;
    get paused(): boolean {
        return this.#paused;
    }

    #sceneCompleted: boolean;
    get sceneCompleted(): boolean {
        return this.#sceneCompleted;
    }

    #currentScene: string;
    get currentScene(): string {
        return this.#currentScene;
    }

    #currentText: string;
    get currentText(): string {
        return this.#currentText;
    }

    get choices(): string[] {
        return this.#choices.map((choice) => {
            return choice.text;
        });
    }

    #choices: Array<{
        address: number,
        text: string
    }>;
    #instructionPointer: number;
    #stack: Value[];
    #saveRegister: Value;
    #localVarStore: LocalVariableStore;
    #callStack: Array<{
        id: number,
        stack: Value[],
        variable: LocalVariableStore
    }>;
    #chooseOptions: Array<{
        value: number,
        pointer: number
    }>;
    #definitions: Record<string, string>;

    constructor(binary: Binary, functionHandler: FunctionHandler, chanceCallback?: ChanceHandler, weightedChanceCallback?: WeightedChanceHandler) {
        this.binary = binary;
        this.globalVariableStore = {};
        this.flags = {};
        this.#inChoice = false;
        this.#selectChoice = false;
        this.#runningText = false;

        if (chanceCallback === undefined) {
            this.chanceCallback = (d: number): boolean => d == 1 || Math.random() < d;
        } else {
            this.chanceCallback = chanceCallback;
        }

        if (weightedChanceCallback === undefined) {
            this.weightedChanceCallback = (weights: number[]): number => {
                let sum: number = 0;
                let fixedWeights: number[] = [];

                for (let i: number = 0; i < weights.length; i++) {
                    fixedWeights[i] = sum;
                    sum += weights[i];
                }

                let random: number = Math.random() * (sum - 1);
                let selection: number = - 1;
                let previous: number = - 1;

                for (let i: number = 0; i < fixedWeights.length; i++) {
                    let current: number = fixedWeights[i];

                    if (Math.round(random) >= current && current > previous)
                    {
                        selection = i;
                        previous = current;
                    }
                }

                return selection;
            };
        } else {
            this.weightedChanceCallback = weightedChanceCallback;
        }

        this.#currentScene = null;
        this.#sceneCompleted = false;
        this.#currentText = null;

        this.#instructionPointer = 0;
        this.#paused = true;
        this.#stack = [];
        this.#saveRegister = null;
        this.#localVarStore = new LocalVariableStore(this);
        this.#callStack = [];
        this.#choices = [];
        this.functionHandler = functionHandler;
        this.#chooseOptions = [];
        this.#definitions = {};

        if (binary.translationLoaded) {
            for (const def in binary.definitions) {
                const val: string = this.getDefinition(binary.definitions[def]);
                this.#definitions[binary.stringTable[def]] = val;
            }
        }
    }

    getFlag(flag: string): Value {
        return this.flags[flag];
    }

    setFlag(flag: string, value: Value): void {
        this.flags[flag] = value;
    }

    loadTranslationFile(path: string): void {
        const fileContents: string[] = fs.readFileSync(path).toString().split("\n");

        this.binary.translationTable = [];

        for (const s of fileContents) {
            if (!s.startsWith("#") && !s.startsWith("@") && s.trim() != "") {
                this.binary.translationTable.push(s);
            }
        }

        this.binary.translationLoaded = true;

        for (const def of this.binary.definitions) {
            const name: string = this.binary.stringTable[def.symbol];
            const val: string = this.getDefinition(def);
            this.#definitions[name] = val;
        }
    }

    runScene(sceneName: string): void {
        if (!this.binary.translationLoaded && this.binary.translationTable.length == 0) {
            console.log("[WARNING]: Currently no translations have been loaded! The program will crash when trying to run dialogue!");
        }

        let sceneId = this.lookupScene(sceneName);
        let scene = this.binary.scenes[sceneId];
        let bytecodeIndexes = scene.instructionIndices;

        this.#localVarStore = new LocalVariableStore(this);
        this.#stack = [];

        for (let i: number = 1, flagIndex = 0; i < bytecodeIndexes.length; flagIndex++) {
            this.#instructionPointer = bytecodeIndexes[i++];
            this.#paused = false;
            
            while (!this.#paused) {
                this.update();
            }

            let value = this.#stack.pop();

            this.#instructionPointer = bytecodeIndexes[i++];
            this.#paused = false;

            while (!this.#paused) {
                this.update();
            }

            let name = this.#stack.pop().toString();

            if (!this.flags[name]) {
                this.setFlag(name, value);
            }

            this.#localVarStore.flagMap[flagIndex] = name;
        }

        this.#paused = false;
        this.#instructionPointer = bytecodeIndexes[0];
        this.#currentScene = sceneName;
    }

    chooseChoice(idx: number): void {
        if (idx >= this.#choices.length) {
            throw new Error(`Choice at index ${idx} is outside of the range of choices.`);
        }

        let ip = this.#choices[idx].address;
        this.#instructionPointer = ip;
        this.#selectChoice = false;
        this.#paused = false;
    }

    resume(): void {
        if (this.#runningText) this.#runningText = false;
        if (this.#currentScene === null || !this.#paused) return;

        if (!this.#selectChoice) this.#paused = false;
    }

    update(): void {

    }

    getDefinition(def: string|Definition): string {
        if (typeof def === "string") {
            if (this.#definitions[def]) {
                return this.#definitions[def];
            }

            return this.getDefinition(this.lookupDefinition(def));
        }

        const strRef: number = def.reference;
        const bytecodeIndex: number = def.instructionIndex;

        let value: string = (strRef ^ (1 << 31)) == 0 ? this.binary.stringTable[strRef & 0x7FFFFFFF] : this.binary.translationTable[strRef];
        
        if (bytecodeIndex === - 1) return value;
        
        let iptemp: number = this.#instructionPointer;
        this.#instructionPointer = bytecodeIndex;
        this.#paused = false;
        
        while (!this.#paused) {
            this.update();
        }

        let ret: string = this.interpolate(value, this.#stack.length);
        this.#instructionPointer = iptemp;

        return ret;
    }

    constructArray(elementCount: number): Value {
        const values: Value[] = [];

        for (let i: number = 0; i < elementCount; i++) {
            values.push(this.#stack.pop());
        }

        return values;
    }

    interpolate(format: string, exprCount: number): string {
        const args: Value[] = [];

        for (let i: number = 0; i < exprCount; i++) {
            const val = this.#stack.pop();

            args.push(val);
        }
        
        return;

        // TODO: Question Shad about this functionality
    }

    lookupScene(sceneName: string): number {
        const id: number = this.lookupString(sceneName);
        if (id === - 1) {
            throw new InterpreterRuntimeException("Scene could not be found!");
        }

        const scene: number = this.binary.scenes.findIndex(s => s.symbol === id);
        if (scene === - 1) {
            throw new InterpreterRuntimeException("Scene could not be found!");
        }

        return scene;
    }

    lookupFunction(funcName: string): number {
        const id: number = this.lookupString(funcName);
        if (id === - 1) {
            throw new InterpreterRuntimeException("Function could not be found!");
        }

        const func: number = this.binary.functions.findIndex(s => s.symbol === id);
        if (func === - 1) {
            throw new InterpreterRuntimeException("Function could not be found!");
        }

        return func;
    }

    lookupDefinition(defName: string): Definition {
        const id: number = this.lookupString(defName);
        if (id === - 1) {
            throw new InterpreterRuntimeException("Definition could not be found!");
        }

        const def: Definition|undefined = this.binary.definitions.find(s => s.symbol === id);
        if (def === undefined) {
            throw new InterpreterRuntimeException("Definition could not be found!");
        }

        return def;
    }

    lookupString(str: string): number {
        return this.binary.stringTable.findIndex(s => s === str);
    }

    disassemble(idx: number): string {
        
    }

    disassembleToFile(path: string): void {
        
    }

    toAssembledName(op: Opcode): string {
        
    }
}

/**
 * Thrown whenever an error occurs during Interpreter execution.
 */
class InterpreterRuntimeException extends Error {
    constructor(...params) {
        super(...params);
    }
}

export default Interpreter;