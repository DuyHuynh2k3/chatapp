import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedConversation,
    conversationType,
    subscribeToMessages,
  } = useChatStore();
  
  const { authUser, onlineUsers } = useAuthStore();
  const messageEndRef = useRef(null);

  const currentChat = conversationType === "direct"
    ? useChatStore.getState().users.find(u => u._id === selectedConversation)
    : useChatStore.getState().groups.find(g => g._id === selectedConversation);

  useEffect(() => {
    if (selectedConversation && conversationType) {
      getMessages(selectedConversation, conversationType);
    }

    // Chỉ subscribe khi có selectedConversation
    if (!selectedConversation) return;

    const cleanup = subscribeToMessages();
    
    return () => {
      // Chỉ gọi cleanup nếu nó tồn tại
      if (cleanup) cleanup();
    };
  }, [selectedConversation, conversationType, getMessages, subscribeToMessages]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader chat={currentChat} type={conversationType} />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader 
        chat={currentChat} 
        type={conversationType} 
        isOnline={conversationType === "direct" && onlineUsers.includes(selectedConversation)}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-zinc-500">
              {conversationType === "direct"
                ? "Start a conversation with " + (currentChat?.name || "this user")
                : "Send the first message in " + (currentChat?.name || "this group")}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  {message.senderId === authUser._id ? (
                    <img src={authUser.profilePic || "/avatar.png"} alt="You" />
                  ) : conversationType === "direct" ? (
                    <img src={currentChat?.profilePic || "/avatar.png"} alt={currentChat?.name} />
                  ) : (
                    <img 
                      src={useChatStore.getState().users.find(u => u._id === message.senderId)?.profilePic || "/avatar.png"} 
                      alt="Member" 
                    />
                  )}
                </div>
              </div>
              <div className="chat-header mb-1">
                <span className="mr-2 font-semibold">
                  {message.senderId === authUser._id 
                    ? "You" 
                    : conversationType === "direct"
                      ? currentChat?.name
                      : useChatStore.getState().users.find(u => u._id === message.senderId)?.name}
                </span>
                <time className="text-xs opacity-50">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="max-w-[300px] rounded-md mb-2"
                  />
                )}
                {message.text && <p>{message.text}</p>}
              </div>
            </div>
          ))
        )}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;