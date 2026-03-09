import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { sendAIMessage } from '../api';

export default function AIAssistant({ studentId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: "Hello! 👋 I'm your Academic AI Assistant. Ask me about your performance, study tips, courses, or anything academic!", suggestions: ['How am I performing?', 'Study tips', 'My risk analysis', 'Recommend courses'] }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEnd = useRef(null);

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (text) => {
        const msg = text || input.trim();
        if (!msg) return;

        setMessages(prev => [...prev, { role: 'user', text: msg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await sendAIMessage(msg, studentId);
            setMessages(prev => [...prev, { role: 'bot', text: res.data.response, suggestions: res.data.suggestions }]);
        } catch {
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I couldn't process that. Please try again." }]);
        }
        setLoading(false);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                className="ai-fab"
                onClick={() => setIsOpen(!isOpen)}
                title="AI Assistant"
            >
                {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="ai-chat-window fade-in">
                    <div className="ai-chat-header">
                        <Bot size={18} />
                        <span>Academic AI Assistant</span>
                    </div>

                    <div className="ai-chat-messages">
                        {messages.map((m, i) => (
                            <div key={i} className={`ai-msg ${m.role}`}>
                                <div className="ai-msg-icon">
                                    {m.role === 'bot' ? <Bot size={14} /> : <User size={14} />}
                                </div>
                                <div className="ai-msg-content">
                                    <div className="ai-msg-text" dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                                    {m.suggestions && (
                                        <div className="ai-suggestions">
                                            {m.suggestions.map((s, j) => (
                                                <button key={j} onClick={() => sendMessage(s)}>{s}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="ai-msg bot">
                                <div className="ai-msg-icon"><Bot size={14} /></div>
                                <div className="ai-msg-content"><div className="ai-typing"><span /><span /><span /></div></div>
                            </div>
                        )}
                        <div ref={messagesEnd} />
                    </div>

                    <div className="ai-chat-input">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask me anything..."
                        />
                        <button onClick={() => sendMessage()} disabled={!input.trim()}>
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
