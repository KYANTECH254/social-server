const express = require("express");
const { AuthenticateGoogleUser, CheckUserNameExists, UpdateUser } = require("../controllers/userControllers/userController"); 
const router = express.Router();

router.post("/auth/google", AuthenticateGoogleUser);
router.post("/check/username", CheckUserNameExists);
router.post("/auth/updateUser", UpdateUser);

module.exports = router;
