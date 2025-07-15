import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, MessageCircle, MoreVertical, Trash2 } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = () => {
  const {
    getUsers,
    getGroups,
    users,
    groups,
    selectConversation,
    selectedConversation,
    conversationType,
    isUsersLoading,
    isGroupsLoading,
    deleteGroup,
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const [showDropdown, setShowDropdown] = useState(null);

  const handleDeleteGroup = async (groupId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this group?")) {
      await deleteGroup(groupId);
      setShowDropdown(null);
    }
  };

  const toggleDropdown = (groupId, e) => {
    e.stopPropagation();
    setShowDropdown(showDropdown === groupId ? null : groupId);
  };

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  // Filter online users
  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  const handleSelectUser = (user) => {
    selectConversation(user._id, "direct");
  };

  const handleSelectGroup = (group) => {
    selectConversation(group._id, "group");
  };

  const isUserSelected = (userId) =>
    conversationType === "direct" && selectedConversation === userId;

  const isGroupSelected = (groupId) =>
    conversationType === "group" && selectedConversation === groupId;

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setActiveTab("chats");
              setShowOnlineOnly(false); // Reset filter when switching tabs
            }}
            className={`btn btn-sm flex-1 ${activeTab === "chats" ? "btn-primary" : "btn-ghost"}`}
          >
            <MessageCircle className="size-4" />
            <span className="hidden lg:block ml-2">Chats</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("groups");
              setShowOnlineOnly(false); // Reset filter when switching tabs
            }}
            className={`btn btn-sm flex-1 ${activeTab === "groups" ? "btn-primary" : "btn-ghost"}`}
          >
            <Users className="size-4" />
            <span className="hidden lg:block ml-2">Groups</span>
          </button>
        </div>

        {activeTab === "groups" && (
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="btn btn-sm btn-primary w-full hidden lg:flex items-center justify-center gap-2"
          >
            <Users className="size-4" />
            <span>Create Group</span>
          </button>
        )}

        {activeTab === "chats" && (
          <div className="mt-3 hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
          </div>
        )}
      </div>

      <div className="overflow-y-auto w-full py-3 flex-1">
        {activeTab === "chats" ? (
          <>
            {filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => handleSelectUser(user)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${isUserSelected(user._id) ? "bg-base-300 ring-1 ring-base-300" : ""}`}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user.profilePic || "avatar.png"}
                    alt={user.name}
                    className="size-12 object-cover rounded-full"
                  />
                  {onlineUsers.includes(user._id) && (
                    <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-base-100"></div>
                  )}
                </div>

                <div className="hidden lg:block text-left min-w-0">
                  <div className="font-medium truncate">{user.name}</div>
                  <div className="text-xs text-zinc-500 truncate">
                    {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                  </div>
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center text-zinc-500 py-4">
                {showOnlineOnly ? "No online users" : "No contacts available"}
              </div>
            )}
          </>
        ) : (
          <>
            {groups.map((group) => (
              <div
                key={group._id}
                className={`relative w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${isGroupSelected(group._id) ? "bg-base-300 ring-1 ring-base-300" : ""}`}
              >
                <button
                  onClick={() => handleSelectGroup(group)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className="relative mx-auto lg:mx-0">
                    <img
                      src={group.groupPic || "/group-avatar.jpg"}
                      alt={group.name}
                      className="size-12 object-cover rounded-full"
                    />
                  </div>

                  <div className="hidden lg:block text-left min-w-0 flex-1">
                    <div className="font-medium truncate">{group.name}</div>
                    <div className="text-xs text-zinc-500 truncate">
                      {group.members?.length || 0} members
                    </div>
                  </div>
                </button>

                {(group.admin === authUser._id || group.admin._id === authUser._id) && (
                  <div className="relative">
                    <button
                      onClick={(e) => toggleDropdown(group._id, e)}
                      className="p-1 hover:bg-base-200 rounded-full"
                    >
                      <MoreVertical className="size-4" />
                    </button>

                    {showDropdown === group._id && (
                      <div className="absolute right-0 mt-1 w-40 bg-base-100 rounded-md shadow-lg z-10">
                        <button
                          onClick={(e) => handleDeleteGroup(group._id, e)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-base-200"
                        >
                          <Trash2 className="size-4" />
                          Delete Group
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {groups.length === 0 && (
              <div className="text-center text-zinc-500 py-4">
                No groups available
              </div>
            )}
          </>
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
      />
    </aside>
  );
};

export default Sidebar;
