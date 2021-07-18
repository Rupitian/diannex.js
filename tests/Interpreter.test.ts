import * as path from "path";

import {
    Binary,
    Interpreter,
    FunctionHandler
} from "../";

describe("Interpreter", () => {
    test("runs scene correctly", () => {
        const bin: Binary = Binary.readFromFile(path.resolve(__dirname, "./files/out/general-v3.dxb"));
        const funcHandler: FunctionHandler = new FunctionHandler({
            char: () => { return "" },
            getPlayerName: () => { return "Player 1" }
        });

        const interpreter: Interpreter = new Interpreter(bin, funcHandler);

        interpreter.runScene("area0.intro");

        while (!interpreter.paused) {
            interpreter.update();
        }
        
        expect(interpreter.runningText).toBeTruthy();
        expect(interpreter.currentText).toBe("Welcome to the test introduction scene!");
    });
});