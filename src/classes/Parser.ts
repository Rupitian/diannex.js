import { Definition } from "types";
import BinaryReader from "./BinaryReader";

/**
 * Contains parsing functions for sections which can be loaded later.
 */
class Parser {
    /**
     * Parses scene metadata.
     * @param bfr The BinaryReader with the buffer of the scene metadata to parse.
     */
    static parseSceneMetadata(bfr: BinaryReader): Array<{
        symbol: number;
        instructionIndices: number[];
    }> {
        const scenes: Array<{
            symbol: number;
            instructionIndices: number[];
        }> = [];

        const size: number = bfr.readUInt32();

        for (let i = 0; i < size; i++) {
            const symbol: number = bfr.readUInt32();
            const indicesSize: number = bfr.readUInt16();
            const instructionIndices: number[] = [];

            for (let j = 0; j < indicesSize; j++) {
                instructionIndices.push(bfr.readInt32());
            }

            scenes.push({
                symbol,
                instructionIndices
            });
        }

        return scenes;
    }

    /**
     * Parses function metadata.
     * @param bfr The BinaryReader with the buffer of the function metadata to parse.
     */
    static parseFunctionMetadata(bfr: BinaryReader): Array<{
        symbol: number;
        instructionIndices: number[];
    }> {
        const functions: Array<{
            symbol: number;
            instructionIndices: number[];
        }> = [];

        const size: number = bfr.readUInt32();

        for (let i = 0; i < size; i++) {
            const symbol: number = bfr.readUInt32();
            const indicesSize: number = bfr.readUInt16();
            const instructionIndices: number[] = [];

            for (let j = 0; j < indicesSize; j++) {
                instructionIndices.push(bfr.readInt32());
            }

            functions.push({
                symbol,
                instructionIndices
            });
        }

        return functions;
    }

    /**
     * Parses definition metadata.
     * @param bfr The BinaryReader with the buffer of the definition metadata to parse.
     */
    static parseDefinitionMetadata(bfr: BinaryReader): Definition[] {
        const definitions: Definition[] = [];

        const size: number = bfr.readUInt32();

        for (let i = 0; i < size; i++) {
            const symbol: number = bfr.readUInt32();
            const reference: number = bfr.readUInt32();
            const instructionIndex: number = bfr.readInt32();

            definitions.push({
                symbol,
                reference,
                instructionIndex
            });
        }

        return definitions;
    }

    /**
     * Parses internal string table.
     * @param bfr The BinaryReader with the buffer of the internal string table to parse.
     */
    static parseInternalStringTable(bfr: BinaryReader): string[] {
        const stringTable: string[] = [];

        const size: number = bfr.readUInt32();

        for (let i = 0; i < size; i++) {
            stringTable.push(bfr.readString());
        }

        return stringTable;
    }

    /**
     * Parses internal translation file.
     * @param bfr The BinaryReader with the buffer of the internal translation file to parse.
     */
    static parseInternalTranslationFile(bfr: BinaryReader): string[] {
        const translationTable: string[] = [];

        const size: number = bfr.readUInt32();

        for (let i = 0; i < size; i++) {
            translationTable.push(bfr.readString());
        }

        return translationTable;
    }

    /**
     * Parses external function list.
     * @param bfr The BinaryReader with the buffer of the external function list to parse.
     */
    static parseExternalFunctionList(bfr: BinaryReader): number[] {
        const externalFunctionList: number[] = [];

        const size: number = bfr.readUInt32();

        for (let i = 0; i < size; i++) {
            externalFunctionList.push(bfr.readUInt32());
        }

        return externalFunctionList;
    }
}

export default Parser;
