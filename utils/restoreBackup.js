const {
    execFile
} = require("child_process");

const restoreBackup = (
    backupPath
) => {

    return new Promise(
        (resolve, reject) => {

            execFile(
                "mongorestore",
                [
                    "--uri",
                    process.env.MONGODB_URI,
                    "--drop",
                    backupPath
                ],
                (error, stdout, stderr) => {

                    if (error) {
                        return reject(error);
                    }

                    resolve(stdout);
                }
            );
        }
    );
};

module.exports =
    restoreBackup;