const express = require("express");
const { 
    
    AuthenticateGoogleUser, 
    CheckUserNameExists, 
    UpdateUser, 
    Logout } = require("../controllers/userControllers/userController"); 
const router = express.Router();

router.post("/auth/google", AuthenticateGoogleUser);
router.post("/check/username", CheckUserNameExists);
router.post("/auth/account", UpdateUser);
router.post("/auth/logout", Logout);

module.exports = router;
