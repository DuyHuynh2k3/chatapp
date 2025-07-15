import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { users, getGroups } = useChatStore(); // Thêm getGroups từ useChatStore
  const { authUser } = useAuthStore();
  const { socket } = useAuthStore();
  const [name, setName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupPic, setGroupPic] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setSelectedUsers([]);
      setGroupPic(null);
    }
  }, [isOpen]);

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!name || selectedUsers.length < 2) {
      return toast.error("Vui lòng nhập tên nhóm và chọn ít nhất 2 thành viên");
    }

    setIsSubmitting(true);

    try {
      let imageUrl = "";
      
      if (groupPic) {
        // Tạo base64 từ file ảnh
        const reader = new FileReader();
        const base64Image = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(groupPic);
        });
  
        // Gọi API upload ảnh lên server
        const uploadResponse = await axiosInstance.post("/uploads", {
          uploadPic: base64Image
        });
        
        imageUrl = uploadResponse.data;
      }
      console.log("Image URL:", imageUrl);
      
      // Tạo nhóm với ảnh (nếu có)
      const response = await axiosInstance.post("/groups", {
        name,
        members: selectedUsers,
        groupPic: imageUrl,
      });
      const newGroup = response.data;
      if (socket) {
        selectedUsers.forEach(memberId => {
          socket.emit("group:created", { 
            group: newGroup,
            recipientId: memberId 
          });
        });
      }
      // Lấy lại danh sách nhóm mới nhất
      await getGroups();
      
      toast.success("Tạo nhóm thành công");
      onClose();
    } catch (err) {
      console.error("Error creating group:", err);
      toast.error(err.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-base-100 p-6 rounded-xl w-[95%] max-w-md shadow-lg space-y-4">
        <h2 className="text-lg font-semibold">Tạo nhóm mới</h2>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Tên nhóm</span>
          </label>
          <input
            type="text"
            placeholder="Nhập tên nhóm"
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Ảnh nhóm (tuỳ chọn)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered w-full"
            onChange={(e) => setGroupPic(e.target.files?.[0] || null)}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Chọn thành viên</span>
          </label>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
            {users
              .filter((u) => u._id !== authUser._id)
              .map((user) => (
                <label key={user._id} className="flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => handleUserToggle(user._id)}
                  />
                  <div className="avatar">
                    <div className="w-8 rounded-full">
                      <img src={user.profilePic || "/avatar.png"} alt={user.fullName} />
                    </div>
                  </div>
                  <span>{user.fullName}</span>
                </label>
              ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button 
            className="btn btn-ghost" 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Huỷ
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleCreateGroup} 
            disabled={isSubmitting || !name || selectedUsers.length < 2}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner"></span>
                Đang tạo...
              </>
            ) : "Tạo nhóm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;