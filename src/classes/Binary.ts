import * as fs from "fs";
import * as zlib from "zlib";

import BinaryReader from "classes/BinaryReader";
import { Definition } from "types";

/**
 * Representation of the binary.
 */
class Binary {
    /**
     * True if either an internal translation file is loaded, or when an external translation file is loaded.
     * NOTE: If you try to execute code with dialogue when this is false you *WILL* crash.
     */
    translationLoaded: boolean;
    /**
     * A list of internal strings used in the Diannex code, e.g. function/scene names.
     * [ID]: string
     */
    stringTable: string[];
    /**
     * A list of dialogue and other translatable strings that's displayed to the user.
     */
    translationTable: string[];

    /**
     * A buffer of the instructions to be read at runtime.
     */
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
    definitions: Definition[];

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
     * @param file The DXB file to read from.
     */
    static readFromFile = (file: string): Binary => {
        return Binary.readFromBuffer(fs.readFileSync(file));
    };

    /**
     * Reads DXB data from buffer.
     * @param buf A buffer in the DXB format to read from.
     */
    static readFromBuffer = (buf: Buffer): Binary => {       
        const br: BinaryReader = new BinaryReader(buf);
        const bin: Binary = new Binary();

        // Header
        const signature = br.readChars(3);
        if ("DNX" != signature) {
            throw new BinaryReaderException("Invalid signature.");
        }

        // Version
        const version: number = br.readUInt8();

        if (version != 3) {
            throw new BinaryReaderException("Binary not for this version of Diannex.");
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

            for (let i = 0; i < size; i++) {
                bin.stringTable.push(bfr.readString());
            }
        }

        // Internal translation file
        if (flags.internalTranslationFile) {
            const size: number = bfr.readUInt32();

            for (let i = 0; i < size; i++) {
                bin.translationTable.push(bfr.readString());
            }
        }

        // External function list
        {
            const size: number = bfr.readUInt32();

            for (let i = 0; i < size; i++) {
                bin.externalFunctionList.push(bfr.readUInt32());
            }
        }

        return bin;
    };
}

/**
 * Thrown whenever an error occurs in processing of a Diannex binary.
 */
class BinaryReaderException extends Error {
    constructor(...params) {
        super(...params);
    }
}

export default Binary;