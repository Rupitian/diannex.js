import * as path from "path";

import { Binary } from "../";

describe("Binary", () => {
    test("reads and processes v2 binary file correctly", () => {
        expect(() => {
            Binary.readFromFile(path.resolve(__dirname, "./files/general-v2.dxb"));
        }).toThrowError("Binary not for this version of Diannex.");
    });

    test("reads and processes v3 binary file correctly", () => {
        const bin: Binary = Binary.readFromFile(path.resolve(__dirname, "./files/general-v3.dxb"));

        expect(bin).toMatchSnapshot();
    });
});