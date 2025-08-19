import { SimpleChatInterface } from '../components/chat/SimpleChatInterface';
import { useChat } from '../hooks/useChat';

export default function TestSimpleChat() {
  const {
    messages,
    isLoading,
    sendMessage,
    error
  } = useChat({
    welcomeMessage: true,
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto h-[700px]">
        <SimpleChatInterface
          title="CouplesDNA AI"
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
        />
        
        {error && (
          <div className="mt-4 p-4 bg-white border border-black">
            <p className="text-black text-sm">Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}