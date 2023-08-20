const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

// Signup
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    // Check if the user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = new User({
      username: username,
      email: email,
      password: hashedPassword,
    });
    const savedUser = await user.save();
    res.status(200).json({
      message: "User Registered successfully",
    });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({
      message: error,
    });
  }
};

// SignIn
exports.signin = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const passwordIsValid = bcrypt.compare(req.body.password, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({ message: "Invalid password." });
    }

    const token = jwt.sign({ id: user.id }, process.env.API_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
      message: "Login successful",
      accessToken: token,
    });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json({ message: "An error occurred during sign-in." });
  }
};

// logout
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Logged out successfully",
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// protected routes
exports.protected = (req, res) => {
  // req.user contains the decoded user data from the token
  res
    .status(200)
    .json({ message: "You have access to content!", user: req.user });
};

// upload profile picture
exports.profilePicture = async (req, res) => {
  if (req.file) {
    const filePath = req.file.path;

    const userId = req.user.id;

    try {
      // find the user by ID and update the profilePicture field
      const user = await User.findByIdAndUpdate(userId, {
        profilePicture: filePath,
      });

      if (user) {
        res.status(200).json({
          message: "Profile picture uploaded and associated with the user!",
          user: {
            id: user.id,
            username: user.username,
            profilePicture: user.profilePicture,
          },
        });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.status(400).json({ message: "Profile picture not uploaded" });
  }
};

// getAllUsers
exports.getUsers = async (req, res) => {
  try {
    // fetch all users from the database
    const users = await User.find({}, "-password");

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// send friend request
exports.sendFriendRequest = async (req, res) => {
  try {
    const senderUserId = req.user.id;
    const receiverUserId = req.params.userId;

    if (senderUserId === receiverUserId) {
      return res
        .status(400)
        .json({ message: "You can't send a friend request to yourself" });
    }

    const senderUser = await User.findById(senderUserId);
    const receiverUser = await User.findById(receiverUserId);

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user is already a friend
    if (receiverUser.friends.includes(senderUserId)) {
      return res
        .status(400)
        .json({ message: "You are already friends with this user" });
    }

    // Check if the friend request is not already sent
    if (senderUser.friendRequests.includes(receiverUserId)) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Check if the friend request has been received before
    if (receiverUser.friendRequests.includes(senderUserId)) {
      return res.status(400).json({
        message: "You have already received a friend request from this user",
      });
    }

    senderUser.friendRequests.push(receiverUserId);
    await senderUser.save();

    res.status(200).json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// accept or reject friend request
exports.friendRequest = async (req, res) => {
  try {
    const receiverUserId = req.user.id;
    const senderUserId = req.params.userId;
    const action = req.body.action;

    const receiverUser = await User.findById(receiverUserId);

    if (!receiverUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the friend request was actually sent
    if (!receiverUser.friendRequests.includes(senderUserId)) {
      return res
        .status(400)
        .json({ message: "No friend request from this user" });
    }

    // Remove the sender's ID from the receiver's friendRequests array
    receiverUser.friendRequests = receiverUser.friendRequests.filter(
      (id) => id.toString() !== senderUserId
    );

    // Handle 'accept' or 'reject' action
    if (action === "accept") {
      const senderUser = await User.findById(senderUserId);

      if (!senderUser) {
        return res.status(404).json({ message: "Sender user not found" });
      }

      // Update user's friends arrays
      receiverUser.friends.push(senderUserId);
      senderUser.friends.push(receiverUserId);

      await senderUser.save();
    }
    // Access user details from token
    const user = await User.findByIdAndUpdate(req.user.id);
    const accepterUserId = user.id;
    const accepterUsername = user.username;

    await receiverUser.save();

    res.status(200).json({
      message: `Friend request ${action}ed by ${accepterUsername} (${accepterUserId})`,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// get all friend request of user
exports.friendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate(
      "friendRequests",
      "username"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ friendRequests: user.friendRequests });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// get friends lis of user
exports.friendList = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate("friends", "username");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ friendList: user.friends });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// post remove friends
exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendUserId = req.params.friendUserId;

    const user = await User.findById(userId);
    const friendUser = await User.findById(friendUserId);

    if (!user || !friendUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user has the friend they're trying to remove
    if (!user.friends.includes(friendUserId)) {
      return res
        .status(400)
        .json({ message: "You are not friends with this user" });
    }

    // Remove friendUserId from the user's friends array
    user.friends = user.friends.filter(
      (friendId) => friendId.toString() !== friendUserId
    );
    await user.save();

    // Remove userId from the friendUser's friends array
    friendUser.friends = friendUser.friends.filter(
      (friendId) => friendId.toString() !== userId
    );

    let message = "Friend removed";
    // Check if the user has no friends left
    if (user.friends.length === 0) {
      message += ", and you no longer have any friends";
    }

    await friendUser.save();

    res.status(200).json({ message: message });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
