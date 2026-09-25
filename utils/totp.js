const crypto = require("crypto");

// ========================================
// BASE32 CHARACTERS
// ========================================

const BASE32_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// ========================================
// GENERATE BASE32 SECRET
// ========================================

const generateSecret = () => {
    const randomBytes =
        crypto.randomBytes(20);

    let bits = "";

    for (const byte of randomBytes) {
        bits += byte
            .toString(2)
            .padStart(8, "0");
    }

    let secret = "";

    for (
        let i = 0;
        i < bits.length;
        i += 5
    ) {
        const chunk =
            bits.substring(i, i + 5);

        const padded =
            chunk.padEnd(5, "0");

        const index =
            parseInt(padded, 2);

        secret += BASE32_CHARS[index];
    }

    return secret;
};

// ========================================
// BASE32 DECODE
// ========================================

const base32Decode = (secret) => {
    const cleanSecret =
        secret
            .toUpperCase()
            .replace(/[^A-Z2-7]/g, "");

    let bits = "";

    for (const character of cleanSecret) {
        const index =
            BASE32_CHARS.indexOf(character);

        if (index === -1) {
            throw new Error(
                "Invalid Base32 secret."
            );
        }

        bits += index
            .toString(2)
            .padStart(5, "0");
    }

    const bytes = [];

    for (
        let i = 0;
        i + 8 <= bits.length;
        i += 8
    ) {
        bytes.push(
            parseInt(
                bits.substring(i, i + 8),
                2
            )
        );
    }

    return Buffer.from(bytes);
};

// ========================================
// GENERATE TOTP
// ========================================

const generateTOTP = (
    secret,
    timestamp = Date.now()
) => {
    const key =
        base32Decode(secret);

    const counter =
        Math.floor(
            timestamp / 1000 / 30
        );

    const counterBuffer =
        Buffer.alloc(8);

    counterBuffer.writeBigUInt64BE(
        BigInt(counter)
    );

    const hmac =
        crypto
            .createHmac(
                "sha1",
                key
            )
            .update(counterBuffer)
            .digest();

    const offset =
        hmac[hmac.length - 1] & 0x0f;

    const binaryCode =
        (
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff)
        ) >>> 0;

    const otp =
        binaryCode % 1000000;

    return otp
        .toString()
        .padStart(6, "0");
};

// ========================================
// VERIFY TOTP
// ========================================

const verifyTOTP = (
    secret,
    token,
    window = 1
) => {
    if (
        !secret ||
        !token ||
        !/^\d{6}$/.test(token)
    ) {
        return false;
    }

    const currentTime =
        Date.now();

    for (
        let offset = -window;
        offset <= window;
        offset++
    ) {
        const testTime =
            currentTime +
            offset * 30 * 1000;

        const expected =
            generateTOTP(
                secret,
                testTime
            );

        const expectedBuffer =
            Buffer.from(expected);

        const tokenBuffer =
            Buffer.from(token);

        if (
            expectedBuffer.length ===
            tokenBuffer.length &&
            crypto.timingSafeEqual(
                expectedBuffer,
                tokenBuffer
            )
        ) {
            return true;
        }
    }

    return false;
};

// ========================================
// GOOGLE AUTHENTICATOR URI
// ========================================

const generateOtpAuthUrl = (
    secret,
    email
) => {
    const issuer =
        "Repair History System";

    const label =
        `${issuer}:${email}`;

    const params =
        new URLSearchParams({
            secret,
            issuer,
            algorithm: "SHA1",
            digits: "6",
            period: "30"
        });

    return (
        `otpauth://totp/` +
        `${encodeURIComponent(label)}` +
        `?${params.toString()}`
    );
};

module.exports = {
    generateSecret,
    generateTOTP,
    verifyTOTP,
    generateOtpAuthUrl
};