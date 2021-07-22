import * as path from "path";
import { DiannexFunc, Value } from "types";

import {
    Binary,
    Interpreter,
    FunctionHandler
} from "../";

// "char" mock function
const char = jest.fn((): Value => {
    return "";
});

/**
 * Quick setup for interpreter.
 */
const prep = (file: string, funcs: Record<string, DiannexFunc> = {}) => {
    const bin: Binary = Binary.readFromFile(path.resolve(__dirname, file));
    const funcHandler: FunctionHandler = new FunctionHandler(funcs);
    const interpreter: Interpreter = new Interpreter(bin, funcHandler);

    return interpreter;
};

/**
 * Moves the interpreter instructions forwards.
 */
const move = (interpreter: Interpreter) => {
    interpreter.resume();

    while (!interpreter.paused) {
        interpreter.update();
    }
};

/**
 * General interpreter stepping check
 */
const proceed = (interpreter: Interpreter, text: string, character?: string) => {
    move(interpreter);

    expect(interpreter.runningText).toBeTruthy();
    if (character) {
        expect(char).toHaveBeenLastCalledWith([character]);
    }
    expect(interpreter.currentText).toBe(text);
};

describe("Interpreter", () => {
    test("runs text and char correctly", () => {
        const interpreter = prep("./files/out/char.dxb", { char });

        interpreter.runScene("intro");

        proceed(interpreter, "Line 1", "char0");
        proceed(interpreter, "Line 2");
        proceed(interpreter, "Line 3", "char1");
    });

    test("runs repeat", () => {
        const interpreter = prep("./files/out/repeat.dxb", {});

        interpreter.runScene("intro");

        proceed(interpreter, "Line 1");
        proceed(interpreter, "Repeat");
        proceed(interpreter, "Repeat");
        proceed(interpreter, "Repeat");
        proceed(interpreter, "Line 2");
    });

    test("runs choice correctly", () => {
        const interpreter = prep("./files/out/choice.dxb", {});

        // Yes
        interpreter.runScene("intro");

        proceed(interpreter, "Line 1");
        move(interpreter);
        expect(interpreter.selectChoice).toBeTruthy();
        interpreter.chooseChoice(0);
        proceed(interpreter, "Yes");

        // No
        interpreter.runScene("intro");

        proceed(interpreter, "Line 1");
        move(interpreter);
        expect(interpreter.selectChoice).toBeTruthy();
        interpreter.chooseChoice(1);
        proceed(interpreter, "No");
    });

    test("runs choose correctly", () => {
        const interpreter = prep("./files/out/choose.dxb", {});
        
        // First option
        interpreter.runScene("intro");

        global.Math.random = () => 0;
        proceed(interpreter, "Line 1");
        move(interpreter);
        expect(interpreter.currentText).toBe("Line 2a");
        proceed(interpreter, "Line 3");

        // Second option
        interpreter.runScene("intro");

        global.Math.random = () => 1;
        proceed(interpreter, "Line 1");
        move(interpreter);
        expect(interpreter.currentText).toBe("Line 2b");
        proceed(interpreter, "Line 3");
    });

    test("runs functions and interpolates correctly", () => {
        const interpreter = prep("./files/out/func.dxb", {});
        
        interpreter.runScene("intro");

        proceed(interpreter, "Hello, world");
    });

    test("finds definitions correctly", () => {
        const interpreter = prep("./files/out/def.dxb", {});
        
        expect(interpreter.getDefinition("info.name")).toBe("world");
    });

    test("handles variables correctly", () => {
        const interpreter = prep("./files/out/vars.dxb", {});
        
        interpreter.runScene("intro");

        proceed(interpreter, "Hello, world");
    });

    test("changes scenes correctly", () => {
        const interpreter = prep("./files/out/scenes.dxb", {});
        
        interpreter.runScene("first");
        proceed(interpreter, "First");

        interpreter.runScene("second");
        proceed(interpreter, "Second");
    });
});