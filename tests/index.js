const fs = require("fs");
const unzipper = require("unzipper");
const path = require("path");
const { exec } = require("child_process");

const args = {};

/**
 * Builds the DX test files.
 */
const buildFiles = () => {
    const paths = fs.readdirSync("./tests/files/");

    for (let i = 0; i < paths.length; i++) {   
        const file = paths[i];

        if (!file.endsWith(".dx")) return;

        exec(`"tests/diannex/diannex.exe" --cli --files=./tests/files/${file} --binary ./tests/files/out --name ${path.basename(file, path.extname(file))}`, (err, stdout, stderr) => {
            console.log(stdout);
            console.error(stderr);
            
            if (err) {
                console.error(err);
                return;
            }

            console.log(`Test file "./tests/files/${file}" built.`);
        });
    }
};

/**
 * Downloads the Diannex release.
 */
const downloadDiannex = () => {
    fs.mkdirSync("./tests/downloads/", { recursive: true });

    // Download Diannex release to tests/downloads/diannex.zip
    exec("curl -L https://github.com/Rupitian/diannex/releases/download/v1.3/diannex-1.3-win64.zip > ./tests/downloads/diannex.zip", (err, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
        
        if (err) {
            console.error(err);
            return;
        }
        
        // Unzip to tests/diannex
        fs.createReadStream("./tests/downloads/diannex.zip").pipe(unzipper.Extract({ path: "./tests/diannex" }));

        if (args["build"]) buildFiles();
    });
};

for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg.startsWith("--")) {
        args[arg.substr(2)] = {};
    }
}

if (args["download"]) {
    downloadDiannex();
} else if (args["build"]) {
    buildFiles();
}