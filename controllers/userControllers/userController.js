const fetch = require("node-fetch");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const JWT_SECRET = "your_jwt_secret";
const JWT_REFRESH_SECRET = "your_refresh_secret";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const {
    saveUser,
    getUserName,
    createAccount,
    getUserByEmail,
    storeRefreshToken,
    getRefreshToken,
    deleteRefreshToken,
    storeSession,
    getAccountByEmail
} = require("../../actions/userActions");

function generateToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
}

async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

async function comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

function generateTokens(userId) {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    return { accessToken, refreshToken };
}

async function refreshAuthToken(oldRefreshToken) {
    try {
        const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
        const userId = decoded.userId;
        const storedToken = await getRefreshToken(oldRefreshToken);
        if (!storedToken || storedToken.userId !== userId) {
            return { success: false, message: "Invalid refresh token" };
        }
        if (new Date(storedToken.expiresAt) < new Date()) {
            const deletetoken = await deleteRefreshToken(oldRefreshToken)
            if (!deletetoken) {
                return { success: false, message: "Refresh token not deleted" };
            }
            return { success: false, message: "Refresh token expired" };
        }
        const { accessToken, refreshToken } = generateTokens(userId);
        const rtoken = {
            token: refreshToken,
            userId: userId
        }
        const storedtoken = await storeRefreshToken(rtoken);
        if (!storedtoken) {
            await deleteRefreshToken(oldRefreshToken)
        }
        return { success: true, accessToken, refreshToken };
    } catch (error) {
        console.error("Error refreshing token:", error);
        return { success: false, message: "Invalid refresh token" };
    }
}

async function AuthenticateGoogleUser(req, res) {
    try {
        const { code } = req.body;
        if (!code) return res.status(200).json({ success: false, message: "Authorization code missing" });
        const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
            return res.status(200).json({ success: false, message: "An error occured!", code: code, data: { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } });
        }
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code",
                code,
            }),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) {
            return res.status(200).json({ success: false, message: "Failed to fetch access token" });
        }
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userInfoResponse.json();
        if (!userData.email) {
            return res.status(200).json({ loggedin: false, success: false, message: "Failed to fetch user data" });
        }
        const existing_user = await getUserByEmail(userData.email);
        if (existing_user) {
            const { accessToken, refreshToken } = generateTokens(existing_user.email);
            const rtoken = {
                token: refreshToken,
                userId: existing_user.id
            }
            const storedRefreshToken = await storeRefreshToken(rtoken);
            const session = {
                userId: existing_user.id,
                device: req.headers["user-agent"] || "",
                ip: req.ip || "",
                userAgent: req.headers["user-agent"] || "",
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
            const storedSession = await storeSession(session);
            const account = await getAccountByEmail(existing_user.email);
            if (!account) {
                return res.json({ loggedin: false, success: true, message: "Finish setting up you account.", user: existing_user });
            }
            if (storedRefreshToken || storedSession || account) {
                existing_user.username = account.username;
                existing_user.dob = account.dob;
                return res.json({ loggedin: true, success: true, message: "User authenticated successfully", user: existing_user, accessToken, refreshToken });
            }
            return res.json({ loggedin: false, success: false, message: "An error occured!" });
        }
        const user = await saveUser(userData);
        if (!user) {
            return res.status(200).json({ loggedin: false, success: false, message: "An error occured, try again!" });
        }
        return res.json({ loggedin: false, success: true, message: "Finish setting up you account.", user: user });
    } catch (error) {
        console.error("Error authenticating Google user:", error);
        return res.status(200).json({ loggedin: false, success: false, message: "Internal server error" });
    }
}

async function CheckUserNameExists(req, res) {
    try {
        const { username } = req.body;
        if (!username) return res.status(200).json({ success: false, message: "Username is required" });
        const user = await getUserName(username);
        if (user) {
            return res.json({ success: false, message: "Username already exists", user: user.username });
        }
        return res.json({ success: true, message: "Username available" });
    } catch (error) {
        console.error("Error authenticating user:", error);
        return res.status(200).json({ success: false, message: "Internal server error" });
    }
}

async function UpdateUser(req, res) {
    try {
        const { email, dob, username } = req.body;
        if (!email || !dob || !username) return res.status(200).json({ success: false, message: "Missing data is required" });
        const data = {
            email: email,
            dob: dob,
            username: username
        }
        const account = await createAccount(data);
        if (!account) {
            return res.json({ loggedin: false, success: false, message: "An error occured!" });
        }
        const existing_user = await getUserByEmail(userData.email);
        if (existing_user) {
            const { accessToken, refreshToken } = generateTokens(existing_user.email);
            const rtoken = {
                token: refreshToken,
                userId: existing_user.id
            }
            const storedRefreshToken = await storeRefreshToken(rtoken);
            const session = {
                userId: existing_user.id,
                device: req.headers["user-agent"] || "",
                ip: req.ip || "",
                userAgent: req.headers["user-agent"] || "",
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
            const storedSession = await storeSession(session);
            if (storedRefreshToken || storedSession || account) {
                existing_user.username = account.username;
                existing_user.dob = account.dob;
                return res.json({ loggedin: true, success: true, message: "User authenticated successfully", user: existing_user, accessToken, refreshToken });
            }
            return res.json({ loggedin: false, success: false, message: "An error occured!" });
        }
    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(200).json({ success: false, message: "Internal server error" });
    }
}

module.exports = { AuthenticateGoogleUser, CheckUserNameExists, UpdateUser };
