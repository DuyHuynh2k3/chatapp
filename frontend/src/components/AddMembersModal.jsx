// AddMembersModal.jsx
import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const AddMembersModal = ({ group, isOpen, onClose }) => {
  const { users } = useChatStore();
  const { authUser } = useAuthStore();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter out existing members and current user
  const availableUsers = users.filter(
    user => 
      !group.members.includes(user._id) && 
      user._id !== authUser._id
  );

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsLoading(true);
    try {
      await useChatStore.getState().addMembers(group._id, selectedUsers);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Members</h2>
        
        <div className="max-h-60 overflow-y-auto mb-4">
          {availableUsers.map(user => (
            <div key={user._id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <input
                type="checkbox"
                checked={selectedUsers.includes(user._id)}
                onChange={() => 
                  setSelectedUsers(prev =>
                    prev.includes(user._id)
                      ? prev.filter(id => id !== user._id)
                      : [...prev, user._id]
                  )
                }
              />
              <img 
                src={user.profilePic || "/avatar.png"} 
                alt={user.fullName}
                className="w-8 h-8 rounded-full"
              />
              <span>{user.fullName}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || isLoading}
            className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
          >
            {isLoading ? "Adding..." : "Add Members"}
          </button>
        </div>
      </div>
    </div>
  );
};