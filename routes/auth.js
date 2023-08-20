const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authJWT");
const {
  signup,
  signin,
  logout,
  protected,
} = require("../controllers/appController");

// signup to create users
router.post("/register", signup);

// login to authenticate
router.post("/login", signin);

// Route to log out the user
router.post("/logout", verifyToken, logout);

// protected route
router.get("/protected", verifyToken, protected);

module.exports = router;
