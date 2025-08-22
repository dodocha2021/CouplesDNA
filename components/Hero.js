import React from 'react';
import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { SimpleChatInterface } from './chat/SimpleChatInterface';
import { useChat } from '../hooks/useChat';


// Hero Component - Uses a simple black and white chat interface
export default function Hero({ 
  headlineText = "Decode Your Relationship Patterns",
  subheadlineText = "Transform your everyday conversations into powerful insights for deeper connection and lasting love.",
  animationDelay = 0.1,
  primaryButtonText = "Analyze Message",
  secondaryButtonText = "Upload Your Chat",
  onFileUpload = () => {},
  uploading = false
}) {
  // Use the useChat hook to get the chat status
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
    <div className="w-full h-full flex items-center justify-center bg-white">
      <div className="py-6 md:py-10 w-full max-w-6xl px-4">
        <h1 className="relative z-10 mx-auto max-w-4xl text-center text-3xl font-bold text-slate-800 md:text-4xl lg:text-5xl">
          {headlineText.split(" ").map((word, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ duration: 0.3, delay: index * animationDelay, ease: "easeInOut" }}
              className="mr-2 inline-block"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: headlineText.split(" ").length * animationDelay }}
          className="relative z-10 mx-auto max-w-2xl py-4 text-center text-lg font-normal text-slate-600"
        >
          {subheadlineText}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: (headlineText.split(" ").length * animationDelay) + 0.2 }}
          className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-auto min-w-48 transform rounded-lg bg-black px-6 py-3 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800">
                {primaryButtonText}
              </button>
            </DialogTrigger>
            <DialogContent className="p-0 h-[700px] flex flex-col bg-white max-w-4xl">
              <SimpleChatInterface
                title="CouplesDNA AI"
                messages={messages}
                isLoading={isLoading}
                onSendMessage={sendMessage}
                className="h-full"
              />
              
              {error && (
                <div className="m-4 p-4 bg-white border border-black">
                  <p className="text-black text-sm">Error: {error}</p>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <button 
            className="w-auto min-w-48 transform rounded-lg border border-gray-200 bg-white px-6 py-3 font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-50"
            onClick={onFileUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : secondaryButtonText}
          </button>
        </motion.div>
      </div>
    </div>
  );
}