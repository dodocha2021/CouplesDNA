// Chat default configuration and constants

// API Configuration
export const N8N_WEBHOOK = 'https://couplesdna.app.n8n.cloud/webhook-test/ff627dd8-7f67-4631-b2df-4332067fa07a';

// Default team members
export const defaultMembers = [
  {
    id: "ai",
    name: "CouplesDNA AI",
    avatar: "/couplesdna-ai.png",
    isOnline: true,
    role: "Relationship Assistant",
    lastMessage: "Hi, I am CouplesDNA AI, how can I help you?"
  }
];

// Default welcome messages for each expert
export const defaultWelcome = {
  ai: {
    id: 1,
    content: "Hi, I am CouplesDNA AI, how can I help you?",
    sender: {
      name: "CouplesDNA AI",
      avatar: "/couplesdna-ai.png",
      isOnline: true,
      isCurrentUser: false,
    },
    timestamp: new Date(),
  }
};

// Helper function to initialize messages by expert
export const createInitialMessages = () => {
  const obj = {};
  defaultMembers.forEach(m => {
    obj[m.id] = [defaultWelcome[m.id]];
  });
  return obj;
};