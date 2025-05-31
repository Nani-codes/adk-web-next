import { Chat } from "@/components/chat/chat";
import { AppSelector } from "@/components/app-selector/app-selector";

export default function ChatPage() {
  return (
    <div className="flex h-screen">
      <div className="w-64 border-r">
        <AppSelector />
      </div>
      <div className="flex-1">
        <Chat />
      </div>
    </div>
  );
} 