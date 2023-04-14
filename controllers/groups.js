const Group = require("../models/Group");
const User = require("../models/User");

//@desc     Get all groups
//@route    GET /api/v1/groups
//@access   Private
exports.getAllGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({})
      .populate({
        path: "users",
        select: "username email",
      })
      .populate({
        path: "messages",
        populate: {
          path: "sender",
          model: "User",
          select: "username email",
        },
      });
    return res
      .status(200)
      .json({ success: true, count: groups.length, data: groups });
  } catch {
    console.log(err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Groups" });
  }
};

//@desc     Get single group
//@route    GET /api/v1/groups/:id
//@access   Private
exports.getSingleGroup = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId)
      .populate({
        path: "users",
        select: "username email",
      })
      .populate({
        path: "messages",
        populate: {
          path: "sender",
          model: "User",
          select: "username email",
        },
      });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: `No Group with the id of ${groupId}`,
      });
    }
    return res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.log(err.stack);
    return res.status(500).json({
      success: false,
      message: `Cannot find Group`,
    });
  }
};

//@desc     Create single group
//@route    POST /api/v1/groups
//@access   Private
exports.createGroup = async (req, res, next) => {
  try {
    const name = req.body.name;
    const group = await Group.create({
      name: name,
      users: [req.user.id],
    });
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { groups: group._id } },
      { new: true }
    );
    return res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.log(err.stack);
    // duplicate group name
    if (err.code && err.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "This group name has already taken" });
    }
    return res.status(500).json({
      success: false,
      message: `Cannot create Group'`,
    });
  }
};

//@desc     Update group (add user, add message, change name)
//          request body: users: string[], removeUsers: string[],
//                        messages: string[], name: string
//@route    PATCH /api/v1/groups/:id
//@access   Private
exports.updateGroup = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const { name, users, messages, removeUsers } = req.body;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: `No Group with the id of ${groupId}`,
      });
    }

    if (name) {
      group.name = name;
    }

    if (users) {
      group.users.addToSet(...users);
      // update the groups field of all users in the new users array
      await User.updateMany(
        { _id: { $in: users } },
        { $addToSet: { groups: group._id } }
      );
    }

    if (messages) {
      group.messages.push(...messages);
    }

    if (removeUsers) {
      const updatedUsers = group.users.filter(
        (userId) => !removeUsers.includes(String(userId))
      );
      group.users = updatedUsers;
      // update the groups field of all removed users
      await User.updateMany(
        { _id: { $in: removeUsers } },
        { $pull: { groups: group._id } }
      );
    }

    await group.save();
    return res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.log(err.stack);
    // duplicate group name
    if (err.code && err.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "This group name has already taken" });
    }
    return res.status(500).json({
      success: false,
      message: `Cannot update Group`,
    });
  }
};
