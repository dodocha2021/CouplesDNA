import React from 'react';
import { Dialog as ConfirmDialog } from '@/components/ui/dialog';
import Navigation from '../components/Navigation';
import Hero from '../components/Hero';
import { useTeamChat } from '../hooks/useTeamChat';
import { useFileUpload } from '../hooks/useFileUpload';
import { useReportGenerator } from '../hooks/useReportGenerator';
import { defaultWelcome } from '../config/chatDefaults';










function Home() {
  const {
    teamMembers,
    selectedMember,
    messages,
    input,
    isLoading,
    sessionId,
    deleting,
    setInput,
    handleSubmit,
    handleMemberSelect,
    handleDeleteChat,
    setMessages,
    setSessionId,
  } = useTeamChat();

  const { uploading, fileInputRef, handleFileChange } = useFileUpload({
    onFileUploaded: (fileMessage, success) => {
      setMessages(prev => [...prev, fileMessage]);
    }
  });

  const { generatingReport, reportProgress, handleGenerateReport } = useReportGenerator({
    sessionId,
    setSessionId
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <Navigation />

      {/* Global hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{
          display: 'none',
          position: 'absolute',
          left: '-9999px'
        }}
        onChange={handleFileChange}
        disabled={uploading || isLoading}
        accept="*/*"
      />

      {/* Hero Section */}
      <Hero 
        teamMembers={teamMembers}
        selectedMember={selectedMember}
        messages={messages}
        input={input}
        isLoading={isLoading}
        uploading={uploading}
        onMemberSelect={handleMemberSelect}
        onSubmit={handleSubmit}
        onInputChange={(e) => setInput(e.target.value)}
        onFileUpload={() => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        fileInputRef={fileInputRef}
handleDeleteChat={handleDeleteChat}
        deleting={deleting}
      />

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What You Miss</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Most couples never see these deeper currents that flow through their daily interactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💕</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Subtle ways love is expressed and received</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recurring patterns that create distance</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💪</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Hidden strengths in your communication</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Emotional triggers and repair opportunities</h3>
            </div>
          </div>
      </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Decode Your Relationship?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of couples who&apos;ve discovered deeper connection, better communication, and lasting love through CouplesDNA.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-blue-600 hover:bg-gray-100 h-12 px-8"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Your Conversation'}
            </button>
            <button 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-500 text-white hover:bg-blue-600 h-12 px-8"
              onClick={handleGenerateReport}
              disabled={generatingReport}
            >
              {generatingReport ? (reportProgress || 'Generating...') : 'Generate Report'}
            </button>
          </div>
          <div className="flex justify-center items-center gap-6 mt-6 text-blue-100">
            <span>✓ Secure upload</span>
            <span>✓ Privacy guaranteed</span>
            <span>✓ Results in 24 hours</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">CouplesDNA</h3>
            <p className="text-gray-400 mb-6">
              Helping couples build stronger, more connected relationships through the power of conversation analysis.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <div className="p-6">
            <h4 className="text-lg font-semibold mb-2">Delete All Chat History</h4>
            <p className="mb-4">Are you sure you want to delete all chat history? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >Cancel</button>
              <button
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  await handleDeleteChat();
                  setShowDeleteConfirm(false);
                }}
                disabled={deleting}
              >{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}

export default Home; 