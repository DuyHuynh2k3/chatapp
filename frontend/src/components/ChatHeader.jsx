import { X, Users, LogOut, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

const ChatHeader = () => {
  const {
    selectedConversation,
    conversationType,
    selectConversation,
    users,
    groups,
    leaveGroup, // Đảm bảo đã import từ useChatStore
    addMembers,
  } = useChatStore();

  const { authUser, onlineUsers } = useAuthStore();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  // Lấy thông tin conversation hiện tại
  const currentChat =
    conversationType === "direct"
      ? users.find((u) => u._id === selectedConversation)
      : groups.find((g) => g._id === selectedConversation);
  const isGroupAdmin =
    conversationType === "group" &&
    (currentChat?.admin?._id?.toString() === authUser._id.toString() ||
      currentChat?.admin?.toString() === authUser._id.toString());
  // Kiểm tra user hiện tại có phải là thành viên nhóm không
  const isGroupMember =
    conversationType === "group" &&
    currentChat?.members?.some((member) =>
      typeof member === "object"
        ? member._id === authUser._id
        : member === authUser._id
    );
  // Danh sách user có thể thêm vào nhóm (loại bỏ thành viên hiện tại)
  const availableUsers = users.filter(
    (user) =>
      !currentChat?.members?.some(
        (member) =>
          (typeof member === "object" ? member._id : member) === user._id
      ) && user._id !== authUser._id
  );

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    setIsAddingMembers(true);
    try {
      await addMembers(currentChat._id, selectedUsers);
      toast.success(`Đã thêm ${selectedUsers.length} thành viên`);
      setShowAddMemberModal(false);
      setSelectedUsers([]);
    } catch (error) {
      toast.error(error.message || "Lỗi khi thêm thành viên");
    } finally {
      setIsAddingMembers(false);
    }
  };
  const handleCloseChat = () => {
    selectConversation(null, null);
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversation) return;

    try {
      const { socket } = useAuthStore.getState();

      // ✅ Kiểm tra socket connection
      if (!socket?.connected) {
        const shouldRetry = window.confirm(
          "Kết nối real-time bị gián đoạn. Bạn có muốn thử lại?"
        );
        if (shouldRetry) {
          socket.connect();
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      await leaveGroup(selectedConversation);
      toast.success("Đã rời nhóm thành công");

      // Không cần gọi selectConversation vì socket sẽ tự xử lý
    } catch (error) {
      toast.error(error.message || "Lỗi khi rời nhóm");
    } finally {
      setShowLeaveModal(false);
    }
  };

  if (!currentChat || !conversationType) return null;

  return (
    <div className="p-4 border-b border-base-300 bg-base-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={
                  conversationType === "direct"
                    ? currentChat.profilePic || "/avatar.png"
                    : currentChat.groupPic || "/group-avatar.jpg"
                }
                alt={currentChat.name}
                className="object-cover"
              />
              {conversationType === "direct" &&
                onlineUsers.includes(currentChat._id) && (
                  <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-base-100"></div>
                )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">
                {currentChat.name || currentChat.fullName}
              </h3>
              {conversationType === "group" && (
                <Users className="size-4 text-base-content/70" />
              )}
            </div>

            <p className="text-sm text-base-content/70">
              {conversationType === "direct"
                ? onlineUsers.includes(currentChat._id)
                  ? "Online"
                  : "Offline"
                : `${currentChat.members?.length || 0} thành viên`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {conversationType === "group" && isGroupAdmin && (
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="btn btn-ghost btn-sm text-success hover:bg-success/10"
              aria-label="Thêm thành viên"
              title="Thêm thành viên"
            >
              <UserPlus className="size-5" />
              <span className="hidden sm:inline ml-1">Thêm thành viên</span>
            </button>
          )}
          {conversationType === "group" && isGroupMember && (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="btn btn-ghost btn-sm text-error hover:bg-error/10"
              aria-label="Rời nhóm"
              title="Rời nhóm"
            >
              <LogOut className="size-5" />
              <span className="hidden sm:inline ml-1">Rời nhóm</span>
            </button>
          )}

          <button
            onClick={handleCloseChat}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Đóng chat"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Thành viên nhóm (tùy chọn) */}
      {conversationType === "group" && (
        <div className="mt-2">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="text-sm text-blue-500 hover:underline"
          >
            {showMembers ? "Ẩn thành viên" : "Xem thành viên"}
          </button>

          {showMembers && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {currentChat.members?.map((member) => {
                const memberData =
                  typeof member === "object"
                    ? member
                    : users.find((u) => u._id === member) || { _id: member };

                return (
                  <div
                    key={memberData._id}
                    className="flex items-center gap-2 p-1 hover:bg-base-200 rounded"
                  >
                    <div className="avatar">
                      <div className="size-6 rounded-full">
                        <img
                          src={memberData.profilePic || "/avatar.png"}
                          alt={memberData.fullName || "Thành viên"}
                        />
                      </div>
                    </div>
                    <span className="text-sm">
                      {memberData._id === currentChat.admin?._id ? (
                        <span className="font-bold">
                          {memberData.fullName || "Thành viên"} (QTV)
                        </span>
                      ) : (
                        memberData.fullName || "Thành viên"
                      )}
                      {onlineUsers.includes(memberData._id) && (
                        <span className="ml-2 text-green-500">• Online</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Thêm thành viên */}
      {/* Modal thêm thành viên */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-white bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white shadow border border-1 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Thêm thành viên</h2>

            <div className="max-h-60 overflow-y-auto mb-4 space-y-2">
              {availableUsers.length === 0 ? (
                <p className="text-center py-4">
                  Không có thành viên nào để thêm
                </p>
              ) : (
                availableUsers.map((user) => (
                  <label
                    key={user._id}
                    className="flex items-center gap-3 p-2 hover:border hover:border-1  rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers((prev) => [...prev, user._id]);
                        } else {
                          setSelectedUsers((prev) =>
                            prev.filter((id) => id !== user._id)
                          );
                        }
                      }}
                      className="checkbox checkbox-sm"
                    />
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedUsers([]);
                }}
                className="btn btn-ghost"
              >
                Hủy
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedUsers.length === 0 || isAddingMembers}
                className="btn btn-primary"
              >
                {isAddingMembers ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Đang thêm...
                  </>
                ) : (
                  `Thêm (${selectedUsers.length})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Xác nhận rời nhóm */}
      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveGroup}
        title="Xác nhận rời nhóm"
        message="Bạn có chắc chắn muốn rời khỏi nhóm này?"
        confirmText="Rời nhóm"
        confirmColor="error"
      />
    </div>
  );
};

export default ChatHeader;
