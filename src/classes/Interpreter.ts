import * as fs from "fs";

import Opcode from "enums/Opcode";
import Definition from "types/Definition";
import Value from "types/Value";
import Binary from "./Binary";
import FunctionHandler from "./FunctionHandler";
import LocalVariableStore from "./LocalVariableStore";

/**
 * A method used to randomly decide if a Choice/Choose option will be displayed.
 *
 * @param {number} chance The normalized chance of being displayed.By default it's 1 if no chances were declared.
 * @return {boolean} Whether or not the Choice/Choose option should be displayed.
 */
type ChanceHandler = (chance: number) => boolean;
/**
 * A method used to randomly pick a Choose option.
 *
 * @param {number[]} weights A list of normalized weights for each Choose option.By default a weight is 1 if no weight was specified for that specific Choose option.
 * @return {number} Which Choose option to select.
 */
type WeightedChanceHandler = (chance: number[]) => number;

class Interpreter {
    /**
     * See {@link Binary}.
     */
    binary: Binary;
    /**
     * See {@link FunctionHandler}.
     */
    functionHandler: FunctionHandler;
    /**
     * A map of variables that persists between scopes.
     */
    globalVariableStore: Record<string, Value>;
    /**
     * A map of global flags that persists between execution of the same scope.
     */
    flags: Record<string, Value>;

    /**
     * See {@link ChanceHandler}.
     */
    chanceCallback: ChanceHandler;
    /**
     * See {@link WeightedChanceHandler}.
     */
    weightedChanceCallback: WeightedChanceHandler;
    
    /**
     * True whenever the Interpreter is processing Choices.
     */
    inChoice: boolean;
    /**
     * True whenever the Interpreter is waiting for the User to select a Choice.
     * @see {@link Interpreter.chooseChoice}
     */
    selectChoice: boolean;
    /**
     * True whenever the Interpreter is waiting for the User to finish displaying {@link Interpreter.currentText}.
     */
    runningText: boolean;
    /**
     * True whenever the Interpreter is waiting for any reason, or if {@link Interpreter.sceneCompleted} is true.
     */
    paused: boolean;
    /**
     * True whenever the Interpreter is done executing the {@link Interpreter.currentScene}.
     */
    sceneCompleted: boolean;
    /**
     * The name of the currently running scene as set by {@link Interpreter.runScene}.
     */
    currentScene: string;
    /**
     * The line of dialogue to be displayed.
     */
    currentText: string;

    /**
     * A list of choices to display to the user to pick from.
     */
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

    /**
     * The Interpreter for the Diannex bytecode.
     *
     * @param binary The specific Diannex {@link Binary} to interpret.
     * @param functionHandler Used for executing external methods in Diannex code.
     * @param chanceCallback See .
     * @param weightedChanceCallback See .
     */
    constructor(binary: Binary, functionHandler: FunctionHandler, chanceCallback?: ChanceHandler, weightedChanceCallback?: WeightedChanceHandler) {
        this.binary = binary;
        this.globalVariableStore = {};
        this.flags = {};
        this.inChoice = false;
        this.selectChoice = false;
        this.runningText = false;

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
                let selection: number = -1;
                let previous: number = -1;

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

        this.currentScene = null;
        this.sceneCompleted = false;
        this.currentText = null;

        this.#instructionPointer = 0;
        this.paused = true;
        this.#stack = [];
        this.#saveRegister = null;
        this.#localVarStore = new LocalVariableStore(this);
        this.#callStack = [];
        this.#choices = [];
        this.functionHandler = functionHandler;
        this.#chooseOptions = [];
        this.#definitions = {};

        if (binary.translationLoaded) {
            for (const def of binary.definitions) {
                const val: string = this.getDefinition(def);
                this.#definitions[binary.stringTable[def.symbol]] = val;
            }
        }
    }

    /**
     * Gets a flag from the Diannex Context.
     * 
     * NOTE: The Scene/Method where the flag is defined **MUST BE EXECUTED FIRST** before the flag will populate.
     *
     * @param flag The flag to get.
     * @return The flag as a {@link Value}.
     */
    getFlag(flag: string): Value {
        return this.flags[flag];
    }

    /**
     * Sets a flag from the Diannex Context.
     * 
     * If a flag is set before it is defined (see remark on {@link Interpreter.getFlag}), then the value will be treated as the default.
     * 
     * WARNING: The value **MUST BE OF THE SAME TYPE** as it is defined the code, otherwise undefined behaviour may occur.
     *
     * @param flag The flag to set.
     * @param value The {@link Value} to set the flag to.
     */
    setFlag(flag: string, value: Value): void {
        this.flags[flag] = value;
    }

    /**
     * Loads a translation file that's generated by the Diannex compiler.
     * 
     * NOTE: Loading a translation file will reload all the Definitions.
     *
     * @param path The path to the translation file.
     */
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

    /**
     * Begins execution of a scene from the Diannex code.
     * 
     * NOTE: If the scene has flags, this is where they'll be populated.
     *
     * @param sceneName The symbol name of the scene to run (e.g. "test.scene0")
     */
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
            this.paused = false;
            
            while (!this.paused) {
                this.update();
            }

            let value = this.#stack.pop();

            this.#instructionPointer = bytecodeIndexes[i++];
            this.paused = false;

            while (!this.paused) {
                this.update();
            }

            let name = this.#stack.pop().toString();

            if (!this.flags[name]) {
                this.setFlag(name, value);
            }

            this.#localVarStore.flagMap[flagIndex] = name;
        }

        this.paused = false;
        this.#instructionPointer = bytecodeIndexes[0];
        this.currentScene = sceneName;
    }

    /**
     * If  is true, this will select the choice and resume the Interpreter.
     * 
     * WARNING: If this runs before {@link Interpreter.selectChoice} is true, it will throw an exception!
     *
     * @param idx The 0 based index of choice, relative to {@link Interpreter.selectChoice}.
     */
    chooseChoice(idx: number): void {
        if (idx >= this.#choices.length) {
            throw new Error(`Choice at index ${idx} is outside of the range of choices.`);
        }

        let ip = this.#choices[idx].address;
        this.#instructionPointer = ip;
        this.selectChoice = false;
        this.paused = false;
    }

    /**
     * Resumes the interpreter if {@link Interpreter.paused} is true.
     */
    resume(): void {
        if (this.runningText) this.runningText = false;
        if (this.currentScene === null || !this.paused) return;

        if (!this.selectChoice) this.paused = false;
    }

    /**
     * Steps through the Bytecode instruction by instruction.
     * 
     * NOTE: If {@link Interpreter.paused} is true, this method will do nothing,
     * so you don't need to check if the Interpreter is paused before running
     * the method.
     */
    update(): void {
        if (this.paused) return;

        let opcode: Opcode = this.binary.instructions[this.#instructionPointer++];
        let arg1: number = 0;
        let arg2: number = 0;

        switch (opcode)
        {
            case Opcode.FreeLocal:
            case Opcode.PushInt:
            case Opcode.PushString:
            case Opcode.PushBinaryString:
            case Opcode.MakeArray:
            case Opcode.SetVarGlobal:
            case Opcode.SetVarLocal:
            case Opcode.PushVarGlobal:
            case Opcode.PushVarLocal:
            case Opcode.Jump:
            case Opcode.JumpTruthy:
            case Opcode.JumpFalsey:
            case Opcode.ChoiceAdd:
            case Opcode.ChoiceAddTruthy:
            case Opcode.ChooseAdd:
            case Opcode.ChooseAddTruthy:
                arg1 = this.binary.instructions.readInt32LE(this.#instructionPointer);
                this.#instructionPointer += 4;
                break;

            case Opcode.PushInterpolatedString:
            case Opcode.PushBinaryInterpolatedString:
            case Opcode.Call:
            case Opcode.CallExternal:
                arg1 = this.binary.instructions.readInt32LE(this.#instructionPointer);
                this.#instructionPointer += 4;
                
                arg2 = this.binary.instructions.readInt32LE(this.#instructionPointer);
                this.#instructionPointer += 4;
                break;

            case Opcode.PushDouble:
                arg1 = this.binary.instructions.readDoubleLE(this.#instructionPointer);
                this.#instructionPointer += 8;
                break;
        }

        switch (opcode) {
            case Opcode.Nop:
                return;

            // #region Stack instructions
            case Opcode.FreeLocal:
                this.#localVarStore.delete(arg1);
                break;

            case Opcode.Save:
                this.#saveRegister = this.#stack[this.#stack.length - 1];
                break;

            case Opcode.Load:
                this.#stack.push(this.#saveRegister);
                break;

            case Opcode.PushUndefined:
                this.#stack.push(undefined);
                break;

            case Opcode.PushInt:
                this.#stack.push(arg1);
                break;

            case Opcode.PushDouble:
                this.#stack.push(arg1);
                break;

            case Opcode.PushString:
                this.#stack.push(this.binary.translationTable[arg1]);
                break;

            case Opcode.PushInterpolatedString:
                this.#stack.push(this.interpolate(this.binary.translationTable[arg1], arg2));
                break;

            case Opcode.PushBinaryString:
                this.#stack.push(this.binary.stringTable[arg1]);
                break;

            case Opcode.PushBinaryInterpolatedString:
                this.#stack.push(this.interpolate(this.binary.stringTable[arg1], arg2));
                break;

            case Opcode.MakeArray:
                this.#stack.push(this.constructArray(arg1));
                break;

            case Opcode.PushArrayIndex: {
                let indx: Value = this.#stack.pop();
                let arr: Value = this.#stack.pop();
                if (typeof indx === "number") this.#stack.push(arr[indx]);
                break;
            }

            case Opcode.SetArrayIndex: {
                let val: Value = this.#stack.pop();
                let indx: Value = this.#stack.pop();
                let arr: Value = this.#stack.pop();
                if (typeof indx === "number") arr[indx] = val;
                this.#stack.push(arr);
                break;
            }

            case Opcode.SetVarGlobal: {
                let val: Value = this.#stack.pop();
                this.globalVariableStore[this.binary.stringTable[arg1]] = val;
                break;
            }

            case Opcode.SetVarLocal: {
                let val: Value = this.#stack.pop();

                if (arg1 >= this.#localVarStore.count) {
                    let count: number = arg1 - this.#localVarStore.count - 1;

                    for (let i: number = 0; i < count; i++) {
                        this.#localVarStore.add(undefined);
                    }

                    this.#localVarStore.add(val);
                } else {
                    this.#localVarStore.set(arg1, val);
                }
                break;
            }

            case Opcode.PushVarGlobal:
                this.#stack.push(this.globalVariableStore[this.binary.stringTable[arg1]]);
                break;

            case Opcode.PushVarLocal:
                this.#stack.push(this.#localVarStore.get(arg1));
                break;

            case Opcode.Pop:
                this.#stack.pop();
                break;

            case Opcode.Duplicate: {
                let val: Value = this.#stack.pop();
                this.#stack.push(val);
                this.#stack.push(val);
                break;
            }

            case Opcode.Duplicate2: {
                let val1: Value = this.#stack.pop();
                let val2: Value = this.#stack.pop();
                this.#stack.push(val2);
                this.#stack.push(val1);
                this.#stack.push(val2);
                this.#stack.push(val1);
                break;
            }

            // #endregion
    
            // #region Value modification
            case Opcode.Add: { 
                let val1: Value = this.#stack.pop();
                let val2: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val2 + val1); 
                break;
            }

            case Opcode.Subtract: {
                let val1: Value = this.#stack.pop();
                let val2: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val2 - val1); 
                break;
            }
                
            case Opcode.Multiply: { 
                let val1: Value = this.#stack.pop();
                let val2: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val2 * val1);
                break;
            }

            case Opcode.Divide: { 
                let val1: Value = this.#stack.pop();
                let val2: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val2 / val1); 
                break;
            }

            case Opcode.Modulo: {
                let val1: Value = this.#stack.pop();
                let val2: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val2 % val1); 
                break;
            }
                
            case Opcode.Negate:
                this.#stack.push(-this.#stack.pop());
                break;

            case Opcode.Invert: {
                let val: Value = this.#stack.pop();
                this.#stack.push(val ? 0 : 1);
                break;
            }

            case Opcode.BitLeftShift: {
                let shift: Value = this.#stack.pop();
                let val: Value = this.#stack.pop();
                if (typeof shift === "number" && typeof val === "number") this.#stack.push(val << shift); 
                break;
            }

            case Opcode.BitRightShift: {
                let shift: Value = this.#stack.pop();
                let val: Value = this.#stack.pop();
                if (typeof shift === "number" && typeof val === "number") this.#stack.push(val >> shift); 
                break;
            }

            case Opcode.BitAnd: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val1 & val2); 
                break;
            }

            case Opcode.BitOr: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val1 | val2); 
                break;
            }

            case Opcode.BitExclusiveOr: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val1 ^ val2); 
                break;
            }

            case Opcode.BitNegate: { 
                let val: Value = this.#stack.pop();
                if (typeof val === "number") this.#stack.push(~ val); 
                break;
            }

            case Opcode.Power: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(Math.pow(val1, val2));
                break;
            }
            //#endregion
        
            // #region Value comparison
            case Opcode.CompareEqual: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val1 == val2 ? 1 : 0);
                break;
            }

            case Opcode.CompareGreaterThan: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val1 > val2 ? 1 : 0);
                break;
            }

            case Opcode.CompareLessThan: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val1 < val2 ? 1 : 0);
                break;
            }

            case Opcode.CompareGreaterThanEqual: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val1 >= val2 ? 1 : 0);
                break;
            }

            case Opcode.CompareLessThanEqual: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val1 <= val2 ? 1 : 0);
                break;
            }

            case Opcode.CompareNotEqual: {
                let val2: Value = this.#stack.pop();
                let val1: Value = this.#stack.pop();
                if (typeof val1 === "number" && typeof val2 === "number") this.#stack.push(val1 != val2 ? 1 : 0);
                break;
            }

            // #endregion

            // #region Instruction pointer modification
            case Opcode.Jump:
                this.#instructionPointer += arg1;
                break;

            case Opcode.JumpTruthy:
                if (this.#stack.pop()) {
                    this.#instructionPointer += arg1;
                }
                break;

            case Opcode.JumpFalsey:
                if (this.#stack.pop()) {
                    this.#instructionPointer += arg1;
                }
                break;

            case Opcode.Exit:
                this.#localVarStore.clear();

                if (this.#callStack.length == 0) {
                    this.#instructionPointer = -1;
                    this.paused = true;
                    this.sceneCompleted = true;
                } else {
                    let cs: {id: number, stack: Value[], variable: LocalVariableStore } = this.#callStack.pop();
                    this.#instructionPointer = cs.id;
                    this.#stack = cs.stack;
                    this.#localVarStore = cs.variable;
                    this.#stack.push(undefined);
                }
                break;

            case Opcode.Return: {
                this.#localVarStore.clear();

                let returnVal: Value = this.#stack.pop();
                let cs: { id: number, stack: Value[], variable: LocalVariableStore } = this.#callStack.pop();

                this.#instructionPointer = cs.id;
                this.#stack = cs.stack;
                this.#localVarStore = cs.variable;
                this.#stack.push(returnVal);
                break;
            }

            case Opcode.Call: {
                let val: Value[] = [];
                for (let i: number = 0; i < arg2; i++) {
                    val[i] = this.#stack.pop();
                }
            
                let temp: Array<{ id: number, stack: Value[], variable: LocalVariableStore }> = this.#callStack.splice(0);
                temp.push({
                    id: this.#instructionPointer,
                    stack: this.#stack, 
                    variable: this.#localVarStore 
                });

                this.#callStack = [];
                this.#stack = [];
                this.#localVarStore = new LocalVariableStore(this);
                let bytecodeIndexes: number[] = this.binary.functions[arg1].instructionIndices;

                for (let i: number = 1, flagIndex = 0; i < bytecodeIndexes.length; i += 2, flagIndex++) {
                    this.#instructionPointer = bytecodeIndexes[i];
                    this.paused = false;
                    while (!this.paused) {
                        this.update();
                    }
                    let value: Value = this.#stack.pop();

                    this.#instructionPointer = bytecodeIndexes[i + 1];
                    this.paused = false;
                    while (!this.paused) {
                        this.update();
                    }
                    let name: Value = this.#stack.pop();

                    if (typeof name === "string") {
                        if (!this.flags[name]) {
                            this.setFlag(name, value);
                        }
                        this.#localVarStore.flagMap[flagIndex] = name;
                    }
                }

                this.paused = false;
                this.#callStack = temp;
                this.#instructionPointer = bytecodeIndexes[0];

                for (let i: number = 0; i < arg2; i++) {
                    this.#localVarStore.add(val[i]);
                }
                break;
            }

            case Opcode.CallExternal: {
                let name: string = this.binary.stringTable[arg1];
                let val: Value[] = [];
                
                for (let i: number = 0; i < arg2; i++) {
                    val[i] = this.#stack.pop();
                }

                this.#stack.push(this.functionHandler.invoke(name, val));
                break;
            }
            // #endregion

            // #region Choice/Choose
            case Opcode.ChoiceBegin:
                if (this.inChoice) {
                    throw new InterpreterRuntimeException("Choice begins while another choice is being processed!");
                }

                this.inChoice = true;
                break;

            case Opcode.ChoiceAdd: {
                if (!this.inChoice) {
                    throw new InterpreterRuntimeException("Attempted to add a choice when no choice is being processed!");
                }

                let chance: Value = this.#stack.pop();
                let text: Value = this.#stack.pop();

                if (typeof chance === "number" && typeof text === "string") {
                    if (this.chanceCallback(chance)) {
                        this.choices[this.#instructionPointer + arg1] = text;
                    }
                }
                break;
            }

            case Opcode.ChoiceAddTruthy: {
                if (!this.inChoice) {
                    throw new InterpreterRuntimeException("Attempted to add a choice when no choice is being processed!");
                }

                let chance: Value = this.#stack.pop();
                let text: Value = this.#stack.pop();
                let condition: Value = this.#stack.pop();

                if (typeof chance === "number" && typeof text === "string") {
                    if (condition && this.chanceCallback(chance)) {
                        this.choices[this.#instructionPointer + arg1] = text;
                    }
                }
                break;
            }

            case Opcode.ChoiceSelect: {
                if (!this.inChoice) {
                    throw new InterpreterRuntimeException("Attempted to wait for user choice when no choice is being processed!");
                }

                if (this.#choices.length == 0) {
                    throw new InterpreterRuntimeException("Attempted to wait for user choice when there's no choices to choose!");
                }

                this.selectChoice = true;
                this.paused = true;
                break;
            }

            case Opcode.ChooseAdd:
            case Opcode.ChooseAddTruthy: {
                let chance: Value = this.#stack.pop();

                if (typeof chance === "number") {
                    if (opcode != Opcode.ChooseAddTruthy || this.#stack.pop()) {
                        this.#chooseOptions.push({
                            value: chance, pointer: this.#instructionPointer + arg1 
                        });
                    }
                }
                break;
            }

            case Opcode.ChooseSelect: {
                let selection: number = this.weightedChanceCallback(this.#chooseOptions.map(t => t.value));

                if (selection == -1 || selection >= this.#chooseOptions.length) {
                    throw new Error(`Selection returned by WeightedChanceCallback was out of bounds. Selection: ${selection}`);
                }

                this.#instructionPointer = this.#chooseOptions[selection].pointer;
                this.#chooseOptions = [];
                break;
            }

            case Opcode.TextRun: {
                let text: Value = this.#stack.pop();

                if (typeof text === "string") {
                    this.currentText = text;
                    this.runningText = true;
                    this.paused = true;
                }
                break;
            }
            
                // #endregion
        }
    }

    /**
     * Retrieves a definition from the Diannex code.
     * 
     * NOTE: Definitions are loaded when the Interpreter is constructed if the binary
     * was created with no private/public translation files.
     * 
     * Otherwise, they will be loaded whenever the {@link Interpreter.loadTranslationFile} method is called.
     * 
     * **THIS MEANS INTERPOLATED STRINGS IN DEFINITIONS WON'T CHANGE UNTIL THEY'RE LOADED AGAIN.**
     *
     * @param defname The symbol name of the definition (e.g. "definitions.main")
     * @return The value of the definition, which will always be a string.
     */
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
        
        if (bytecodeIndex === -1) return value;
        
        let iptemp: number = this.#instructionPointer;
        this.#instructionPointer = bytecodeIndex;
        this.paused = false;
        
        while (!this.paused) {
            this.update();
        }

        let ret: string = this.interpolate(value, this.#stack.length);
        this.#instructionPointer = iptemp;

        return ret;
    }

    /**
     * Moves an amount of values from the stack to a new array.
     * 
     * @param elementCount The amount of elements to move.
     * @returns The array of values that were moved.
     */
    constructArray(elementCount: number): Value[] {
        const values: Value[] = [];

        for (let i: number = 0; i < elementCount; i++) {
            values.push(this.#stack.pop());
        }

        return values;
    }

    /**
     * Replaces ${symbol} in a string with the value of the given symbol unless escaped with \.
     * 
     * @param format The string to be interpolated.
     * @param exprCount The amount of expressions that will be passed to the format string.
     * @returns The interpolated string.
     */
    interpolate(format: string, exprCount: number): string {
        // Read all values
        const values: Value[] = [];
        for (let i: number = 0; i < exprCount; i++) {
            const val = this.#stack.pop();
            values.push(val);
        }

        // Replace ${i} with values[i], but not if $ or { are preceeded with a \.
        let str: string = format;
        let insertStart: number = -1;
        let isEscaping: boolean = false;
        
        for (let i: number = 0; i < str.length; i++) {
            switch (str[i]) {
                case "\\": {
                    isEscaping = !isEscaping;
                    continue;
                }

                case "$": {
                    if (!isEscaping) {
                        insertStart = i;
                    }
                    break;
                }

                case "{": {
                    if (isEscaping) {
                        insertStart = -1;
                    }
                    break;
                }

                case "}": {
                    if (insertStart != -1) {
                        const start: string = str.slice(0, insertStart);
                        const id: number = parseInt(str.slice(insertStart + 2, i));
                        const end: string = str.slice(i + 1);
                    
                        str = start + values[id] + end;
                        insertStart = -1;
                    }
                    break;
                }
            }

            isEscaping = false;
        }
        
        return str;
    }

    /**
     * Finds a scene ID by name.
     * 
     * @param sceneName The scene name.
     * @return The ID of the scene.
     */
    lookupScene(sceneName: string): number {
        const id: number = this.lookupString(sceneName);
        if (id === -1) {
            throw new InterpreterRuntimeException("Scene could not be found!");
        }

        const scene: number = this.binary.scenes.findIndex(s => s.symbol === id);
        if (scene === -1) {
            throw new InterpreterRuntimeException("Scene could not be found!");
        }

        return scene;
    }

    /**
     * Finds a function ID by name.
     * 
     * @param funcName The function name.
     * @return The ID of the function.
     */
    lookupFunction(funcName: string): number {
        const id: number = this.lookupString(funcName);
        if (id === -1) {
            throw new InterpreterRuntimeException("Function could not be found!");
        }

        const func: number = this.binary.functions.findIndex(s => s.symbol === id);
        if (func === -1) {
            throw new InterpreterRuntimeException("Function could not be found!");
        }

        return func;
    }

    /**
     * Finds a definition ID by name.
     * 
     * @param defName The definition name.
     * @return The ID of the definition.
     */
    lookupDefinition(defName: string): Definition {
        const id: number = this.lookupString(defName);
        if (id === -1) {
            throw new InterpreterRuntimeException("Definition could not be found!");
        }

        const def: Definition|undefined = this.binary.definitions.find(s => s.symbol === id);
        if (def === undefined) {
            throw new InterpreterRuntimeException("Definition could not be found!");
        }

        return def;
    }

    /**
     * Finds the ID of a string.
     * 
     * @param str The string to find.
     * @return The ID of the scene.
     */
    lookupString(str: string): number {
        return this.binary.stringTable.findIndex(s => s === str);
    }

    // TODO: Implement preprocessor pragma directives.
    // #if DEBUG
    /*disassemble(idx: number): string {
        
    }

    disassembleToFile(path: string): void {
        
    }

    toAssembledName(op: Opcode): string {
        
    }*/
    // #endif
}

/**
 * Thrown whenever an error occurs during {@link Interpreter} execution.
 */
class InterpreterRuntimeException extends Error {
    constructor(...params) {
        super(...params);
    }
}

export default Interpreter;