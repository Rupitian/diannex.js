import * as fs from "fs";
import * as zlib from "zlib";

import BinaryReader from "classes/BinaryReader";
import Definition from "types/Definition";

/**
 * Representation of the binary.
 */
class Binary {
    translationLoaded: boolean;
    stringTable: string[];
    translationTable: string[];

    instructions: Buffer;
    externalFunctionList: number[];

    scenes: Array<{
        symbol: number,
        instructionIndices: number[]
    }>;
    functions: Array<{
        symbol: number,
        instructionIndices: number[]
    }>;
    definitions: Array<Definition>;

    constructor() {
        this.translationLoaded = false;
        this.stringTable = [];
        this.translationTable = [];

        this.instructions = Buffer.from([]);
        this.externalFunctionList = [];

        this.scenes = [];
        this.functions = [];
        this.definitions = [];
    }
    
    /**
     * Reads DXB data from file.
     * @param path Path to file
     */
    static readFromFile = (path: string): Binary => {
        return Binary.readFromBuffer(fs.readFileSync(path));
    };

    /**
     * Reads DXB data from buffer.
     * @param buf Buffer containing DXB data
     */
    static readFromBuffer = (buf: Buffer): Binary => {       
        const br: BinaryReader = new BinaryReader(buf);
        const bin: Binary = new Binary();

        // Header
        const signature = br.readChars(3);
        if ("DNX" != signature) {
            throw new Error("Invalid signature.");
        }

        // Version
        const version: number = br.readUInt8();

        if (version != 3) {
            throw new Error("Binary file not for this version of Diannex.");
        }

        // Flags
        const flagData: number = br.readUInt8();
        const flags: {
            compressed: boolean,
            internalTranslationFile: boolean
        } = {
            compressed: !!(flagData & 1),
            internalTranslationFile: !!((flagData >> 1) & 1)
        };

        console.log(`Binary:\nSignature: ${signature}\nVersion: ${version}\nCompressed?: ${flags.compressed}\nInternal Translation File?: ${flags.internalTranslationFile}`);
        
        bin.translationLoaded = flags.internalTranslationFile;

        // Read size and decompress zlib compressed data
        br.readUInt32(); // Size
        let bfr: BinaryReader = br;

        if (flags.compressed) {
            br.readUInt32(); // Compressed size

            bfr = new BinaryReader(zlib.inflateSync(buf.slice(br.pos)));
        }

        // Scene metadata
        {
            const size: number = bfr.readUInt32();

            for (let i = 0; i < size; i++) {
                const symbol: number = bfr.readUInt32();
                const indicesSize: number = bfr.readUInt16();
                const instructionIndices: number[] = [];
                
                for (let j = 0; j < indicesSize; j++) {
                    instructionIndices.push(bfr.readInt32());
                }

                bin.scenes.push({
                    symbol,
                    instructionIndices
                });
            }
        }

        // Function metadata
        {
            const size: number = bfr.readUInt32();

            for (let i = 0; i < size; i++) {
                const symbol: number = bfr.readUInt32();
                const indicesSize: number = bfr.readUInt16();
                const instructionIndices: number[] = [];
                
                for (let j = 0; j < indicesSize; j++) {
                    instructionIndices.push(bfr.readInt32());
                }

                bin.functions.push({
                    symbol,
                    instructionIndices
                });
            }
        }

        // Definition metadata
        {
            const size: number = bfr.readUInt32();

            for (let i = 0; i < size; i++) {
                const symbol: number = bfr.readUInt32();
                const reference: number = bfr.readUInt32();
                const instructionIndex: number = bfr.readInt32();

                bin.definitions.push({
                    symbol,
                    reference,
                    instructionIndex
                });
            }
        }

        // Bytecode
        {
            const size: number = bfr.readUInt32();

            bin.instructions = Buffer.from(bfr.readBytes(size));
        }

        // Internal string table
        {
            const size: number = bfr.readUInt32();

            console.log(`Internal string count: ${size}`);

            for (let i = 0; i < size; i++) {
                bin.stringTable.push(bfr.readString());
            }
        }

        // Internal translation file
        if (flags.internalTranslationFile) {
            const size: number = bfr.readUInt32();
            console.log(`Translation string count: ${size}`);

            for (let i = 0; i < size; i++) {
                bin.translationTable.push(bfr.readString());
            }
        }

        // External function list
        {
            const size: number = bfr.readUInt32();
            console.log(`External function count: ${size}`);

            for (let i = 0; i < size; i++) {
                bin.externalFunctionList.push(bfr.readUInt32());
            }
        }

        return bin;
    };
}

export default Binary;