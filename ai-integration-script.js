// DASH Over 50+ - AI Integration Script
// Integrates real AI functionality into the existing app

class AIHealthCoach {
    constructor() {
        this.isNetlifyEnvironment = window.location.hostname.includes('netlify.app') || 
                                   window.location.hostname.includes('dash-over-50-ai');
        this.apiEndpoint = this.isNetlifyEnvironment ? '/api/groq-ai' : 'https://your-netlify-site.netlify.app/api/groq-ai';
        this.isTyping = false;
        this.conversationHistory = [];
        this.userLanguage = this.detectLanguage();
        this.initializeEventListeners();
    }

    detectLanguage() {
        // Auto-detect language from browser or localStorage
        const savedLang = localStorage.getItem('userLanguage');
        if (savedLang) return savedLang;
        
        const browserLang = navigator.language || navigator.userLanguage;
        return browserLang.startsWith('it') ? 'it' : 'en';
    }

    initializeEventListeners() {
        // Override the existing AI Coach message sending
        const aiCoachSection = document.getElementById('aiCoachSection');
        if (aiCoachSection) {
            this.setupAIChatInterface(aiCoachSection);
        }

        // Setup quick action buttons
        this.setupQuickActions();
    }

    setupAIChatInterface(section) {
        const messageInput = section.querySelector('#aiMessageInput');
        const sendButton = section.querySelector('#aiSendMessage');
        const chatMessages = section.querySelector('#aiChatMessages');

        if (messageInput && sendButton) {
            // Remove existing event listeners
            const newSendButton = sendButton.cloneNode(true);
            sendButton.parentNode.replaceChild(newSendButton, sendButton);

            // Add new event listener
            newSendButton.addEventListener('click', () => this.sendMessage());

            // Handle Enter key
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    setupQuickActions() {
        const quickActions = document.querySelectorAll('.ai-quick-action');
        quickActions.forEach(button => {
            button.addEventListener('click', () => {
                const question = button.getAttribute('data-question');
                if (question) {
                    this.sendMessage(question);
                }
            });
        });
    }

    async sendMessage(predefinedMessage = null) {
        const messageInput = document.querySelector('#aiMessageInput');
        const chatMessages = document.querySelector('#aiChatMessages');
        
        const message = predefinedMessage || messageInput?.value.trim();
        
        if (!message || this.isTyping) return;

        // Add user message to chat
        this.addMessageToChat(message, 'user');
        
        if (messageInput) messageInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await this.callAIAPI(message);
            this.hideTypingIndicator();
            this.addMessageToChat(response.response, 'ai', response.isEmergency);
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessageToChat(
                this.userLanguage === 'it' 
                    ? 'Mi dispiace, si è verificato un errore. Riprova più tardi.'
                    : 'Sorry, an error occurred. Please try again later.',
                'ai',
                false
            );
        }
    }

    async callAIAPI(message) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                language: this.userLanguage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    addMessageToChat(message, sender, isEmergency = false) {
        const chatMessages = document.querySelector('#aiChatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        if (isEmergency) {
            messageDiv.className += ' emergency-message';
        }

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(message)}</div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Save to conversation history
        this.conversationHistory.push({
            message: message,
            sender: sender,
            timestamp: new Date().toISOString(),
            isEmergency: isEmergency
        });

        this.saveConversationHistory();
    }

    showTypingIndicator() {
        this.isTyping = true;
        const chatMessages = document.querySelector('#aiChatMessages');
        if (!chatMessages) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message ai typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveConversationHistory() {
        try {
            localStorage.setItem('aiCoachHistory', JSON.stringify(this.conversationHistory));
        } catch (error) {
            console.warn('Could not save conversation history:', error);
        }
    }

    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('aiCoachHistory');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
                this.displayConversationHistory();
            }
        } catch (error) {
            console.warn('Could not load conversation history:', error);
        }
    }

    displayConversationHistory() {
        const chatMessages = document.querySelector('#aiChatMessages');
        if (!chatMessages) return;

        this.conversationHistory.forEach(msg => {
            if (msg.sender !== 'system') {
                this.addMessageToChat(msg.message, msg.sender, msg.isEmergency);
            }
        });
    }
}

// CSS for AI Chat improvements
const aiChatStyles = `
<style>
.typing-indicator .typing-dots {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
}

.typing-indicator .typing-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #10b981;
    animation: typing 1.4s infinite;
}

.typing-indicator .typing-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-indicator .typing-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing {
    0%, 60%, 100% {
        transform: scale(1);
        opacity: 0.5;
    }
    30% {
        transform: scale(1.2);
        opacity: 1;
    }
}

.emergency-message {
    background: linear-gradient(135deg, #dc2626, #ef4444) !important;
    border-left: 4px solid #b91c1c !important;
}

.emergency-message .message-text {
    color: white !important;
    font-weight: 600;
}

.ai-quick-action {
    background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
    border: 2px solid transparent;
    transition: all 0.3s ease;
    cursor: pointer;
}

.ai-quick-action:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    border-color: #10b981;
}
</style>
`;

// Initialize AI Coach when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Inject AI chat styles
    document.head.insertAdjacentHTML('beforeend', aiChatStyles);
    
    // Initialize AI Coach
    window.aiCoach = new AIHealthCoach();
    window.aiCoach.loadConversationHistory();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIHealthCoach;
}