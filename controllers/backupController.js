const fs = require("fs");
const path = require("path");

const generateBackup =
    require("../utils/generateBackup");

const restoreBackup =
    require("../utils/restoreBackup");

const createAuditLog =
    require("../utils/auditLogger");

const getBackupDirectory = () => {
    return path.join(
        __dirname,
        "..",
        "backups"
    );
};

const ensureBackupDirectory = () => {
    const backupDirectory =
        getBackupDirectory();

    if (!fs.existsSync(backupDirectory)) {
        fs.mkdirSync(
            backupDirectory,
            {
                recursive: true
            }
        );
    }

    return backupDirectory;
};

// ========================================
// BACKUP PAGE
// ========================================

exports.index = async (
    req,
    res
) => {

    try {

        const backupDirectory =
            ensureBackupDirectory();

        const backups =
            fs.readdirSync(
                backupDirectory,
                {
                    withFileTypes: true
                }
            )
            .filter(
                item => item.isDirectory()
            )
            .map(
                item => item.name
            )
            .sort()
            .reverse();

        res.render(
            "backup/index",
            {
                backups,
                error: null,
                success: null
            }
        );

    } catch (error) {

        console.error(
            "Backup page error:",
            error.message
        );

        res.status(500).render(
            "backup/index",
            {
                backups: [],
                error:
                    "Unable to load backups.",
                success: null
            }
        );
    }
};

// ========================================
// CREATE BACKUP
// ========================================

exports.create = async (
    req,
    res
) => {

    try {

        const outputPath =
            await generateBackup();

        await createAuditLog({
            userId: req.session.userId,
            action: "BACKUP_CREATED",
            target: "Database",
            description:
                `Administrator created backup ${path.basename(outputPath)}.`,
            ipAddress:
                req.ip
        });

        res.redirect(
            "/backup"
        );

    } catch (error) {

        console.error(
            "Backup creation error:",
            error.message
        );

        res.status(500).render(
            "backup/index",
            {
                backups: [],
                error:
                    "Backup creation failed.",
                success: null
            }
        );
    }
};

// ========================================
// RESTORE BACKUP
// ========================================

exports.restore = async (
    req,
    res
) => {

    try {

        const {
            backup
        } = req.body;

        if (
            typeof backup !== "string" ||
            backup.includes("..") ||
            backup.includes("/") ||
            backup.includes("\\")
        ) {

            return res.status(400).send(
                "Invalid backup selection."
            );
        }

        const backupDirectory =
            ensureBackupDirectory();

        const backupPath =
            path.join(
                backupDirectory,
                backup
            );

        if (
            !fs.existsSync(backupPath) ||
            !fs.statSync(backupPath).isDirectory()
        ) {

            return res.status(404).send(
                "Backup not found."
            );
        }

        await restoreBackup(
            backupPath
        );

        await createAuditLog({
            userId: req.session.userId,
            action: "BACKUP_RESTORED",
            target: "Database",
            targetId: backup,
            description:
                `Administrator restored backup ${backup}.`,
            ipAddress:
                req.ip
        });

        res.redirect(
            "/backup"
        );

    } catch (error) {

        console.error(
            "Restore error:",
            error.message
        );

        res.status(500).send(
            "Database restore failed."
        );
    }
};