/**
 * Simple binary buffer reader.
 */
class BinaryReader {
    buf: Buffer;
    pos: number;
    isBigEndian: boolean;
    
    constructor(buf: Buffer, startPos?: number, isBigEndian?: boolean) {
        this.buf = buf;
        this.pos = startPos || 0;
        this.isBigEndian = isBigEndian || false;
    }

    /**
     * Reads a UInt8 from the buffer and moves the cursor.
     */
    readUInt8(): number {
        const out: number = this.buf.readUInt8(this.pos);
        this.pos += 1;
        return out;
    }

    /**
     * Reads a UInt16 from the buffer and moves the cursor.
     */
    readUInt16(): number {
        const out: number = this.isBigEndian ? this.buf.readUInt16BE(this.pos) : this.buf.readUInt16LE(this.pos);
        this.pos += 2;
        return out;
    }

    /**
     * Reads an Int32 from the buffer and moves the cursor.
     */
    readInt32(): number {
        const out: number = this.isBigEndian ? this.buf.readInt32BE(this.pos) : this.buf.readInt32LE(this.pos);
        this.pos += 4;
        return out;
    }

    /**
     * Reads a UInt32 from the buffer and moves the cursor.
     */
    readUInt32(): number {
        const out: number = this.isBigEndian ? this.buf.readUInt32BE(this.pos) : this.buf.readUInt32LE(this.pos);
        this.pos += 4;
        return out;
    }

    /**
     * Reads a double from the buffer and moves the cursor.
     */
    readDouble(): number {
        const out: number = this.isBigEndian ? this.buf.readDoubleBE(this.pos) : this.buf.readDoubleLE(this.pos);
        this.pos += 4;
        return out;
    }
    
    /**
     * Reads a string from the buffer and moves the cursor.
     */
    readString(): string {
        let str: string = "";
        let currentByte: number; 
        
        while ((currentByte = this.readUInt8()) != 0) {
            str += String.fromCharCode(currentByte);
        }

        return str;
    }

    /**
     * Reads a specific amount of bytes from the buffer and moves the cursor.
     */
    readBytes(bytes: number): number[] {
        let out: number[] = [];

        for (let i = 0; i < bytes; i++) {
            out.push(this.readUInt8());
        }

        return out;
    }

    /**
     * Reads a certain amount of characters from the buffer and moves the cursor.
     */
    readChars(bytes: number): string {
        let out: string = "";

        for (let i = 0; i < bytes; i++) {
            out += String.fromCharCode(this.readUInt8());
        }

        return out;
    }
}

export default BinaryReader;