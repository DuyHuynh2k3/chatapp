import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
// Tạo nhóm chat
export const createGroup = async (req, res) => {
  try {
    const { name, members, groupPic } = req.body;
    const userId = req.user._id;

    if (!name || !members || members.length < 2) {
      return res
        .status(400)
        .json({ message: "Group name and at least 2 members required" });
    }

    // Ensure members is an array and doesn't contain duplicates
    const uniqueMembers = [...new Set([...members, userId.toString()])];

    let imageUrl = "";
    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      imageUrl = uploadResponse.secure_url;
    }

    const group = new Group({
      name,
      members: uniqueMembers,
      admin: userId,
      groupPic: imageUrl,
    });

    await group.save();

    // Populate the group data to send to clients
    const populateGroup = async (group) => {
      return await Group.populate(group, [
        { path: "members", select: "_id fullName profilePic" },
        { path: "admin", select: "_id fullName profilePic" },
      ]);
    };

    // Trong hàm createGroup
    const populatedGroup = await Group.findById(group._id)
      .populate("members", "_id fullName profilePic")
      .populate("admin", "_id fullName profilePic");

    // Gửi thông báo đến tất cả thành viên
    populatedGroup.members.forEach((member) => {
      io.to(member._id.toString()).emit("group:created", populatedGroup);
    });

    res.status(201).json(populatedGroup);
  } catch (err) {
    console.error("createGroup error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Lấy nhóm của user
export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate(
      "members",
      "-password"
    );
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Gửi tin nhắn nhóm
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const message = new GroupMessage({
      groupId,
      senderId,
      text,
      image: imageUrl,
    });

    await message.save();

    // Giả sử bạn đã có model Group với memberIds
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    group.members.forEach((memberId) => {
      io.to(memberId.toString()).emit("newGroupMessage", message);
    });

    res.status(201).json(message);
  } catch (err) {
    console.error("sendGroupMessage error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Lấy tin nhắn nhóm
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await GroupMessage.find({ groupId });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};
// Xóa nhóm chat
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Kiểm tra người dùng có phải là admin không
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only group admin can delete the group" });
    }

    // Xóa tất cả tin nhắn trong nhóm
    await GroupMessage.deleteMany({ groupId });

    // Xóa nhóm
    await Group.findByIdAndDelete(groupId);

    // Gửi thông báo qua socket
    // Gửi socket tới từng thành viên
    group.members.forEach((memberId) => {
      io.to(memberId.toString()).emit("groupDeleted", { groupId });
    });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error("deleteGroup error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Thêm vào group.controller.js
// controllers/group.controller.js

export const leaveGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.members = group.members.filter(
      (memberId) => memberId.toString() !== userId.toString()
    );

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "_id fullName profilePic")
      .populate("admin", "_id fullName profilePic");

    // Emit đến tất cả thành viên còn lại trong nhóm
    for (const member of updatedGroup.members) {
      io.to(member._id.toString()).emit("group:member-left", {
        groupId,
        leftUserId: userId,
        updatedGroup,
      });
    }

    return res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    console.error("Leave group error:", error);
    res.status(500).json({ message: "Failed to leave group" });
  }
};
// group.controller.js
export const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!members || members.length === 0) {
      return res.status(400).json({ message: "Members are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is admin
    if (group.admin.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    // Filter out existing members
    const newMembers = members.filter(
      memberId => !group.members.includes(memberId)
    );

    if (newMembers.length === 0) {
      return res.status(400).json({ message: "All users are already members" });
    }

    // Update group
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: { $each: newMembers } } },
      { new: true }
    )
      .populate("members", "_id fullName profilePic")
      .populate("admin", "_id fullName profilePic");

    // Send real-time updates
    updatedGroup.members.forEach(member => {
      // Notify new members
      if (newMembers.includes(member._id.toString())) {
        io.to(member._id.toString()).emit("addedToGroup", updatedGroup);
      }
      // Notify existing members
      else {
        io.to(member._id.toString()).emit("groupUpdated", {
          action: "membersAdded",
          group: updatedGroup,
          addedMembers: newMembers
        });
      }
    });

    res.status(200).json(updatedGroup);
  } catch (err) {
    console.error("Add members error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};