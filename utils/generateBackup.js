const {
    execFile
} = require("child_process");

const fs = require("fs");
const path = require("path");

const generateBackup = () => {

    return new Promise(
        (resolve, reject) => {

            const backupDirectory =
                path.join(
                    __dirname,
                    "..",
                    "backups"
                );

            if (!fs.existsSync(backupDirectory)) {

                fs.mkdirSync(
                    backupDirectory,
                    {
                        recursive: true
                    }
                );
            }

            const timestamp =
                new Date()
                    .toISOString()
                    .replace(/[:.]/g, "-");

            const outputPath =
                path.join(
                    backupDirectory,
                    `RepairHistoryDB-${timestamp}`
                );

            execFile(
                "mongodump",
                [
                    "--uri",
                    process.env.MONGODB_URI,
                    "--out",
                    outputPath
                ],
                (error, stdout, stderr) => {

                    if (error) {
                        return reject(error);
                    }

                    resolve(outputPath);
                }
            );
        }
    );
};

module.exports =
    generateBackup;