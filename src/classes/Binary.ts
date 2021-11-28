import * as fs from "fs";
import * as zlib from "zlib";

import BinaryReader from "classes/BinaryReader";
import { Definition } from "types";
import Parser from "./Parser";

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
        symbol: number;
        instructionIndices: number[];
    }>;
    functions: Array<{
        symbol: number;
        instructionIndices: number[];
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

        if (version < 3 || version > 4) {
            throw new BinaryReaderException(
                "Binary not for this version of Diannex."
            );
        }

        // Flags
        const flagData: number = br.readUInt8();
        const flags: {
            compressed: boolean;
            internalTranslationFile: boolean;
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
        if (version >= 4) {
            bfr.readUInt32();
        }
        bin.scenes = Parser.parseSceneMetadata(bfr);

        // Function metadata
        if (version >= 4) {
            bfr.readUInt32();
        }
        bin.functions = Parser.parseFunctionMetadata(bfr);

        // Definition metadata
        if (version >= 4) {
            bfr.readUInt32();
        }
        bin.definitions = Parser.parseDefinitionMetadata(bfr);

        // Bytecode
        const bytecodeSize: number = bfr.readUInt32();
        bin.instructions = Buffer.from(bfr.readBytes(bytecodeSize));

        // Internal string table
        if (version >= 4) {
            bfr.readUInt32();
        }
        bin.stringTable = Parser.parseInternalStringTable(bfr);

        // Internal translation file
        if (flags.internalTranslationFile) {
            if (version >= 4) {
                bfr.readUInt32();
            }
            bin.translationTable = Parser.parseInternalTranslationFile(bfr);
        }

        // External function list
        if (version >= 4) {
            bfr.readUInt32();
        }
        bin.externalFunctionList = Parser.parseExternalFunctionList(bfr);

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
