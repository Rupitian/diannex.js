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

    #currentScene: boolean;
    get currentScene(): boolean {
        return this.#currentScene;
    }

    #currentText: boolean;
    get currentText(): boolean {
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

    }

    runScene(sceneName: string): void {

    }

    chooseChoice(idx: number): void {

    }

    resume(): void {

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
        return;
    }

    interpolate(format: string, exprCount: number): string {
        return;
    }

    lookupScene(sceneName: string): number {
        return;
    }

    lookupFunction(funcName: string): number {
        return;
    }

    lookupDefinition(defName: string): Definition {
        return;
    }    

    lookupString(str: string): number {
        return;
    }

    disassemble(idx: number): string {
        return;
    }

    disassembleToFile(path: string): void {

    }

    toAssembledName(op: Opcode): string {
        return;
    }
}

export default Interpreter;