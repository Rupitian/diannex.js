import * as path from "path";

import Binary from "classes/Binary";

const bin = Binary.readFromFile(path.join(process.cwd(), "files", "general-v3.dxb"));

console.dir(bin, { depth: 4 });