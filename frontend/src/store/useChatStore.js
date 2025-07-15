import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  // State
  messages: [],
  users: [],
  groups: [],
  selectedConversation: null,
  conversationType: null, // 'direct' hoặc 'group'
  isUsersLoading: false,
  isGroupsLoading: false,
  isMessagesLoading: false,

  // Lấy danh sách user có thể chat
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      console.error("Get users error:", error);
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Lấy danh sách nhóm của user
  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      console.error("Get groups error:", error);
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  // Lấy tin nhắn (cho cả chat 1:1 và nhóm)
  getMessages: async (conversationId, type) => {
    set({ isMessagesLoading: true, messages: [] });
    try {
      let endpoint = "";
      if (type === "direct") {
        endpoint = `/messages/${conversationId}`;
      } else if (type === "group") {
        endpoint = `/groups/${conversationId}/messages`;
      }

      if (!endpoint) return;

      const res = await axiosInstance.get(endpoint);
      set({
        messages: res.data,
        selectedConversation: conversationId,
        conversationType: type,
      });
    } catch (error) {
      console.error("Get messages error:", error);
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  addMembers: async (groupId, memberIds) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/members`, {
        members: memberIds,
      });
      // State sẽ được cập nhật qua socket nên không cần setState ở đây
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
      throw error;
    }
  },
  // Thêm action này vào useChatStore
  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        ...(state.selectedConversation === groupId && {
          selectedConversation: null,
          conversationType: null,
          messages: [],
        }),
      }));
    } catch (error) {
      console.error("Failed to leave group:", error);
      throw new Error(error.response?.data?.message || "Failed to leave group");
    }
  },

  // Gửi tin nhắn (xử lý cả chat 1:1 và nhóm)
  sendMessage: async (messageData) => {
    const { selectedConversation, conversationType, messages } = get();
    if (!selectedConversation || !conversationType) return;

    try {
      let endpoint = "";
      let body = messageData;

      if (conversationType === "direct") {
        endpoint = `/messages/send/${selectedConversation}`;
      } else if (conversationType === "group") {
        endpoint = `/groups/${selectedConversation}/messages`;
      }

      const res = await axiosInstance.post(endpoint, body);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      console.error("Send message error:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // Tạo nhóm mới
  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set((state) => ({ groups: [...state.groups, res.data] }));
      return res.data;
    } catch (error) {
      console.error("Create group error:", error);
      toast.error(error.response?.data?.message || "Failed to create group");
      throw error;
    }
  },

  // Socket.io subscriptions
  subscribeToMessages: () => {
    const { selectedConversation, conversationType } = get();
    const socket = useAuthStore.getState().socket;
    if (!socket) return () => {};

    const messageHandler = (newMessage) => {
      const isCurrentDirect =
        conversationType === "direct" &&
        (newMessage.senderId === selectedConversation ||
          newMessage.receiverId === selectedConversation);

      const isCurrentGroup =
        conversationType === "group" &&
        newMessage.groupId === selectedConversation;

      if (isCurrentDirect || isCurrentGroup) {
        set((state) => ({ messages: [...state.messages, newMessage] }));
      }
    };
    const groupCreatedHandler = (group) => {
      set((state) => {
        // Kiểm tra trùng lặp
        if (!state.groups.some((g) => g._id === group._id)) {
          return { groups: [...state.groups, group] };
        }
        return state;
      });
    };
    const groupMemberLeftHandler = ({ groupId, leftUserId, updatedGroup }) => {
      set((state) => {
        // Cập nhật thông tin nhóm
        const updatedGroups = state.groups.map((g) =>
          g._id === groupId ? updatedGroup : g
        );

        // Nếu là người rời nhóm
        if (leftUserId === useAuthStore.getState().authUser?._id) {
          return {
            groups: updatedGroups.filter((g) => g._id !== groupId),
            ...(state.selectedConversation === groupId && {
              selectedConversation: null,
              conversationType: null,
              messages: [],
            }),
          };
        }

        // Nếu là thành viên khác
        return {
          groups: updatedGroups,
          ...(state.selectedConversation === groupId && {
            messages: state.messages,
          }),
        };
      });
    };
    const groupDeletedHandler = ({ groupId }) => {
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedConversation:
          state.selectedConversation === groupId
            ? null
            : state.selectedConversation,
        conversationType:
          state.selectedConversation === groupId
            ? null
            : state.conversationType,
      }));
    };
    // Thêm handler mới
    const addedToGroupHandler = (newGroup) => {
      set((state) => {
        const exists = state.groups.some((g) => g._id === newGroup._id);
        if (exists) return state; // không thêm lại
    
        return {
          groups: [newGroup, ...state.groups],
        };
      });
      toast.success(`You've been added to ${newGroup.name}`);
    };
    

    const groupUpdatedHandler = ({ action, group, addedMembers }) => {
      if (action === "membersAdded") {
        set((state) => ({
          groups: state.groups.map((g) => (g._id === group._id ? group : g)),
        }));
        toast.success(`${addedMembers.length} new members added`);
      }
    };
    socket.on("newMessage", messageHandler);
    socket.on("newGroupMessage", messageHandler);
    socket.on("group:created", groupCreatedHandler);
    socket.on("group:member-left", groupMemberLeftHandler);
    socket.on("groupDeleted", groupDeletedHandler);
    socket.on("addedToGroup", addedToGroupHandler);
    socket.on("groupUpdated", groupUpdatedHandler);
    // Return cleanup function
    return () => {
      socket.off("newMessage", messageHandler);
      socket.off("newGroupMessage", messageHandler);
      socket.off("group:created", groupCreatedHandler);
      socket.off("groupDeleted", groupDeletedHandler);
      socket.off("group:member-left", groupMemberLeftHandler);
      socket.off("addedToGroup", addedToGroupHandler);
      socket.off("groupUpdated", groupUpdatedHandler);
    };
  },
  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);

      // Cập nhật state sau khi xóa
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedConversation:
          state.selectedConversation === groupId
            ? null
            : state.selectedConversation,
        conversationType:
          state.selectedConversation === groupId
            ? null
            : state.conversationType,
      }));

      toast.success("Group deleted successfully");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  },
  // Chọn cuộc trò chuyện (1:1 hoặc nhóm)
  selectConversation: (conversationId, type) => {
    set({
      selectedConversation: conversationId,
      conversationType: type,
      messages: [],
    });
    get().getMessages(conversationId, type);
  },

  // Reset store khi logout
  reset: () =>
    set({
      messages: [],
      users: [],
      groups: [],
      selectedConversation: null,
      conversationType: null,
    }),
}));
