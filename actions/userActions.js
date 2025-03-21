const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

const getUserByEmail = async (email) => {
    if (!email) return null;
    const user = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    return user;
};

const createUser = async (userData) => {
    if (!user) return null;
    const { name, email, avatar, googleId, verifiedEmail, createdAt, updatedAt } = userData;
    const existing_email = await getUserByEmail(email)
    if (existing_email) {
        return false;
    }
    const user = await prisma.user.create({
        data: {
            userData,
        },
    });
    return user;
};

const saveUser = async (userData) => {
    if (!userData) return null;
    const { name, email, picture, id, verified_email } = userData;
    const fuser = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
            name: name,
            avatar: picture,
            verifiedEmail: verified_email,
        },
        create: {
            googleId: id,
            name: name,
            email: email,
            avatar: picture,
            verifiedEmail: verified_email,
        },
    });
    return fuser;
};

const getUserName = async (username) => {
    if (!username) return null;
    const user = await prisma.account.findUnique({
        where: {
            username,
        },
    });
    return user;
};

const createAccount = async (accountData) => {
    if (!accountData) return null;
    const { email, dob, username } = accountData;
    try {
        const fuser = await prisma.account.create({
            data: { 
                email,
                dob,
                username,
            },
        });
        return fuser;
    } catch (error) {
        console.error("Error creating account:", error);
        return null;
    }
};

const getAccountByEmail = async (email) => {
    if (!email) return null;
    const user = await prisma.account.findUnique({
        where: {
            email,
        },
    });
    return user;
};

const storeRefreshToken = async (data) => {
    if (!data) return null;
    const storedtoken = await prisma.refreshToken.create({
        data: {
            userId: data.userId,
            token: data.token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
        },
    });
    return storedtoken;
};

const deleteRefreshToken = async (token) => {
    if (!token) return null;
    const deletetoken = await prisma.refreshToken.delete({
        where: {
            token,
        },
    });
    return true;
};

const getRefreshToken = async (token) => {
    if (!token) return null;
    const storedtoken = await prisma.refreshToken.findUnique({
        where: { token: token },
        include: { user: true },
    });
    return storedtoken;
};

const storeSession = async (session) => {
    if (!session) return null;
    const storedSession = await prisma.session.create({
        data: session,
    });
    return storedSession;
}

const deleteAccessToken = async (token) => {
    if (!token) return null;
    const deletetoken = await prisma.accessToken.delete({
        where: {
            token,
        },
    });
    return true;
};

module.exports = {
    hashPassword,
    comparePassword,
    getUserByEmail,
    createUser,
    saveUser,
    getUserName,
    createAccount,
    storeRefreshToken,
    deleteRefreshToken,
    getRefreshToken,
    storeSession,
    getAccountByEmail,
    deleteAccessToken
};