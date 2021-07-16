import * as path from "path";

import {
    Binary,
    Interpreter,
    FunctionHandler
} from "../";

describe("Interpreter", () => {
    test("reads and processes v3 binary file correctly", () => {
        const bin: Binary = Binary.readFromFile(path.resolve(__dirname, "./files/general-v3.dxb"));
        const funcHandler: FunctionHandler = new FunctionHandler();

        const interpreter: Interpreter = new Interpreter(bin, funcHandler);
    });
});