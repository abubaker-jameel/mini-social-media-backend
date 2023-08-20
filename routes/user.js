const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authJWT");
const {
  profilePicture,
  getUsers,
  sendFriendRequest,
  friendRequest,
  friendRequests,
  friendList,
  removeFriend,
} = require("../controllers/appController");

// const jwt = require("jsonwebtoken");
const upload = require("../middlewares/upload");

// upload profile picture route
router.post(
  "/profile",
  upload.single("profilePicture"),
  verifyToken,
  profilePicture
);

// get all users route
router.get("/users", verifyToken, getUsers);

// Route to send a friend request
router.post("/send-friend-request/:userId", verifyToken, sendFriendRequest);

// Route to accept or reject a friend request
router.put("/friend-request/:userId", verifyToken, friendRequest);

// Route to get the list of friend requests for the authenticated user
router.get("/show-friend-requests", verifyToken, friendRequests);

// Route to get the friend list of the authenticated user
router.get("/friend-list", verifyToken, friendList);

// Route to remove the friend
router.post("/remove-friend/:friendUserId", verifyToken, removeFriend);

module.exports = router;
