import express from "express";
import {
  createGroup,
  getMyGroups,
  sendGroupMessage,
  getGroupMessages,
  deleteGroup,
  leaveGroup ,
  addMembers
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getMyGroups);
router.post("/:groupId/messages", protectRoute, sendGroupMessage);
router.post("/:groupId/leave", protectRoute, leaveGroup );
router.post("/:groupId/members", protectRoute, addMembers);
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.delete("/:groupId", protectRoute, deleteGroup)
export default router;
