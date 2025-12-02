/**
 * UC Oracle - Stunning Chatbot Application
 * A breathtaking, innovative AI assistant interface
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Auto-detect API URL based on environment
// - In development (localhost): use localhost:3000
// - In production (Cloudflare): use same origin
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

// Academic Terminology Glossary
const ACADEMIC_GLOSSARY = {
    'module': 'A self-contained unit of study within a course, usually lasting one semester or academic year',
    'modules': 'Self-contained units of study within a course, usually lasting one semester or academic year',
    'credit': 'A unit of measurement representing the workload and learning outcomes of a module',
    'credits': 'Units of measurement representing the workload and learning outcomes of modules',
    'assessment': 'A task or examination used to evaluate a student\'s understanding and performance',
    'assessments': 'Tasks or examinations used to evaluate a student\'s understanding and performance',
    'semester': 'A half-year academic term, typically lasting 15-18 weeks',
    'tutor': 'An academic staff member who provides guidance and support to students',
    'tutors': 'Academic staff members who provide guidance and support to students',
    'lecture': 'A formal presentation of information by an instructor to students',
    'lectures': 'Formal presentations of information by an instructor to students',
    'seminar': 'A small group session focused on discussion and interactive learning',
    'seminars': 'Small group sessions focused on discussion and interactive learning',
    'coursework': 'Written or practical work completed during a course, often contributing to the final grade',
    'dissertation': 'A long research project or essay, typically required for a degree',
    'prerequisite': 'A requirement that must be completed before enrolling in a particular module or course',
    'prerequisites': 'Requirements that must be completed before enrolling in particular modules or courses',
    'foundation degree': 'A two-year vocational qualification equivalent to the first two years of a bachelor\'s degree',
    'fd': 'Foundation Degree - a two-year vocational qualification (Years 1 & 2)',
    'bsc': 'Bachelor of Science - a three-year undergraduate degree (at UC Leeds, Year 3 top-up only)',
    'top-up': 'A final year of study (Year 3) that converts a Foundation Degree into a full Bachelor\'s degree',
    'hons': 'Honours - indicates a higher level of achievement in a bachelor\'s degree',
    'honours': 'A higher level of achievement in a bachelor\'s degree',
    'academic year': 'The period during which academic courses are taught, typically September to June',
    'academic week': 'A numbered week within the academic calendar, used for scheduling and deadlines',
    'deadline': 'The latest date and time by which an assignment or task must be submitted',
    'syllabus': 'An outline of the topics, learning outcomes, and assessments for a course or module',
    'learning outcomes': 'Specific skills and knowledge that students are expected to gain from a module',
    'academic calendar': 'The official schedule showing term dates, holidays, and important deadlines',
    'extenuating circumstances': 'Exceptional situations that may affect a student\'s ability to complete work or attend',
    'study skills': 'Techniques and strategies for effective learning and academic success',
    'formative assessment': 'Assessment designed to provide feedback on learning progress without contributing to the final grade',
    'summative assessment': 'Assessment that counts towards the final grade for a module'
};

// ═══════════════════════════════════════════════════════════════════════════
// DOM ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════

const elements = {
    // Main elements
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    connectionStatus: document.getElementById('connectionStatus'),
    welcomeExperience: document.getElementById('welcomeExperience'),
    
    // Stats
    messageCount: document.getElementById('messageCount'),
    avgResponse: document.getElementById('avgResponse'),
    charCount: document.getElementById('charCount'),
    statMessages: document.getElementById('statMessages'),
    statAvgTime: document.getElementById('statAvgTime'),
    statContext: document.getElementById('statContext'),
    
    // Side panel
    sidePanel: document.getElementById('sidePanel'),
    uploadBtn: document.getElementById('uploadBtn'),
    closePanelBtn: document.getElementById('closePanelBtn'),
    documentInput: document.getElementById('documentInput'),
    uploadButton: document.getElementById('uploadButton'),
    uploadStatus: document.getElementById('uploadStatus'),
    
    // Theme and actions
    themeToggle: document.getElementById('themeToggle'),
    clearChatButton: document.getElementById('clearChatButton'),
    
    // Quick actions
    quickActions: document.querySelectorAll('.quick-action')
};

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let state = {
    messageCount: 0,
    totalResponseTime: 0,
    conversationHistory: [],
    isLoading: false
};

const MAX_HISTORY_LENGTH = 20;

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    initializeTheme();
    initializeEventListeners();
    checkServerStatus();
    configureMarked();
    
    // Periodic status check
    setInterval(checkServerStatus, 30000);
}

function configureMarked() {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

function initializeEventListeners() {
    // Message input
    elements.messageInput.addEventListener('input', handleInputChange);
    elements.messageInput.addEventListener('keydown', handleInputKeydown);
    
    // Buttons
    elements.sendButton.addEventListener('click', sendMessage);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.clearChatButton.addEventListener('click', clearChat);
    elements.uploadButton.addEventListener('click', uploadDocument);
    
    // Side panel
    elements.uploadBtn?.addEventListener('click', () => toggleSidePanel(true));
    elements.closePanelBtn?.addEventListener('click', () => toggleSidePanel(false));
    
    // Quick actions
    elements.quickActions.forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.dataset.query;
            if (query) {
                elements.messageInput.value = query;
                sendMessage();
            }
        });
    });
    
    // Close panel on outside click
    document.addEventListener('click', (e) => {
        if (elements.sidePanel?.classList.contains('open') && 
            !elements.sidePanel.contains(e.target) && 
            e.target !== elements.uploadBtn) {
            toggleSidePanel(false);
        }
    });
}

function handleInputChange() {
    // Auto-resize textarea
    const input = elements.messageInput;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    
    // Update character count
    if (elements.charCount) {
        elements.charCount.textContent = input.value.length;
    }
}

function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
}

function toggleTheme() {
    const isLightMode = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
    
    // Animate toggle button
    elements.themeToggle.style.transform = 'scale(0.9)';
    setTimeout(() => {
        elements.themeToggle.style.transform = '';
    }, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER STATUS
// ═══════════════════════════════════════════════════════════════════════════

async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (data.status === 'ok' && data.pineconeConnected) {
            updateConnectionStatus('connected', 'Connected');
        } else {
            updateConnectionStatus('error', 'Not Connected');
        }
    } catch (error) {
        console.error('Server status check failed:', error);
        updateConnectionStatus('error', 'Offline');
    }
}

function updateConnectionStatus(status, text) {
    if (elements.connectionStatus) {
        elements.connectionStatus.className = `connection-status ${status}`;
        const label = elements.connectionStatus.querySelector('.status-label');
        if (label) label.textContent = text;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SIDE PANEL
// ═══════════════════════════════════════════════════════════════════════════

function toggleSidePanel(open) {
    if (elements.sidePanel) {
        elements.sidePanel.classList.toggle('open', open);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGING
// ═══════════════════════════════════════════════════════════════════════════

async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || state.isLoading) return;
    
    // Clear input
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    if (elements.charCount) elements.charCount.textContent = '0';
    
    // Hide welcome experience
    hideWelcomeExperience();
    
    // Add user message
    addMessage('user', message);
    
    // Set loading state
    setLoadingState(true);
    const loadingId = addLoadingMessage();
    
    const startTime = Date.now();
    
    try {
        // Add to conversation history
        state.conversationHistory.push({ role: 'user', content: message });
        
        // Trim history if needed
        if (state.conversationHistory.length > MAX_HISTORY_LENGTH) {
            state.conversationHistory = state.conversationHistory.slice(-MAX_HISTORY_LENGTH);
        }
        
        // Send to API
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                conversationHistory: state.conversationHistory,
                namespace: 'ucl-courses'
            })
        });
        
        const data = await response.json();
        const responseTime = Date.now() - startTime;
        
        // Remove loading message
        removeLoadingMessage(loadingId);
        
        if (response.ok) {
            // Add assistant response
            addMessage('assistant', data.response, data.sources, false, data.suggestions);
            
            // Update conversation history
            state.conversationHistory.push({ role: 'assistant', content: data.response });
            
            // Update stats
            state.messageCount++;
            state.totalResponseTime += responseTime;
            updateStats();
        } else {
            const errorMsg = `Error: ${data.error || 'Something went wrong'}`;
            addMessage('assistant', errorMsg, null, true);
            state.conversationHistory.push({ role: 'assistant', content: errorMsg });
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeLoadingMessage(loadingId);
        const errorMsg = 'Sorry, I encountered an error. Please make sure the server is running.';
        addMessage('assistant', errorMsg, null, true);
        state.conversationHistory.push({ role: 'assistant', content: errorMsg });
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(loading) {
    state.isLoading = loading;
    elements.messageInput.disabled = loading;
    elements.sendButton.disabled = loading;
    elements.sendButton.classList.toggle('loading', loading);
}

function hideWelcomeExperience() {
    if (elements.welcomeExperience) {
        elements.welcomeExperience.style.opacity = '0';
        elements.welcomeExperience.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.welcomeExperience.style.display = 'none';
        }, 300);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE RENDERING
// ═══════════════════════════════════════════════════════════════════════════

function addMessage(role, content, sources = null, isError = false, suggestions = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = `message-avatar ${role === 'assistant' ? 'ai-avatar' : ''}`;
    
    if (role === 'user') {
        avatar.innerHTML = '👤';
    } else {
        avatar.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; color: var(--text-inverse);">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
            </svg>
        `;
    }
    
    // Content
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Format content
    if (role === 'assistant' && typeof marked !== 'undefined') {
        const html = marked.parse(content);
        bubble.innerHTML = addAcademicTooltips(html);
    } else {
        bubble.textContent = content;
    }
    
    if (isError) {
        bubble.style.background = 'rgba(239, 68, 68, 0.1)';
        bubble.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    }
    
    messageContent.appendChild(bubble);
    
    // Add suggestion tiles if present
    if (suggestions && suggestions.length > 0) {
        const tilesContainer = createSuggestionTiles(suggestions);
        messageContent.appendChild(tilesContainer);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

function addLoadingMessage() {
    const loadingId = `loading-${Date.now()}`;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = loadingId;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai-avatar';
    avatar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; color: var(--text-inverse);">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        </svg>
    `;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble message-loading';
    bubble.innerHTML = `
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    messageContent.appendChild(bubble);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return loadingId;
}

function removeLoadingMessage(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUGGESTION TILES
// ═══════════════════════════════════════════════════════════════════════════

function createSuggestionTiles(suggestions) {
    const container = document.createElement('div');
    container.className = 'suggestion-tiles';
    
    const header = document.createElement('div');
    header.className = 'suggestion-tiles-header';
    header.textContent = 'Choose an option:';
    container.appendChild(header);
    
    suggestions.forEach((suggestion, index) => {
        const tile = document.createElement('div');
        tile.className = 'suggestion-tile';
        tile.setAttribute('role', 'button');
        tile.setAttribute('tabindex', '0');
        
        // Title
        const title = document.createElement('div');
        title.className = 'suggestion-tile-title';
        title.textContent = suggestion.title;
        tile.appendChild(title);
        
        // Details
        if (suggestion.details && suggestion.details.length > 0) {
            const details = document.createElement('div');
            details.className = 'suggestion-tile-details';
            
            suggestion.details.forEach(detail => {
                const detailSpan = document.createElement('span');
                detailSpan.className = 'suggestion-tile-detail';
                detailSpan.innerHTML = `<span>${detail.icon}</span><span>${detail.label}</span>`;
                details.appendChild(detailSpan);
            });
            
            tile.appendChild(details);
        }
        
        // Click handler
        tile.addEventListener('click', () => handleSuggestionClick(suggestion.query, tile));
        tile.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSuggestionClick(suggestion.query, tile);
            }
        });
        
        container.appendChild(tile);
    });
    
    return container;
}

function handleSuggestionClick(query, tileElement) {
    // Visual feedback
    tileElement.style.transform = 'translateX(8px) scale(0.98)';
    tileElement.style.opacity = '0.6';
    
    setTimeout(() => {
        elements.messageInput.value = query;
        sendMessage();
    }, 150);
}

// ═══════════════════════════════════════════════════════════════════════════
// ACADEMIC TOOLTIPS
// ═══════════════════════════════════════════════════════════════════════════

function addAcademicTooltips(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    function processTextNode(node) {
        if (node.nodeType !== Node.TEXT_NODE) return;
        
        let text = node.textContent;
        let hasReplacements = false;
        let newHTML = text;
        
        const terms = Object.keys(ACADEMIC_GLOSSARY).sort((a, b) => b.length - a.length);
        const replacedRanges = [];
        
        terms.forEach(term => {
            const regex = new RegExp(`\\b(${term})\\b`, 'gi');
            
            text.replace(regex, (match, capture, offset) => {
                const overlaps = replacedRanges.some(range => 
                    (offset >= range.start && offset < range.end) ||
                    (offset + match.length > range.start && offset + match.length <= range.end)
                );
                
                if (!overlaps) {
                    const definition = ACADEMIC_GLOSSARY[term.toLowerCase()];
                    const replacement = `<span class="academic-term">${match}<span class="tooltip">${definition}</span></span>`;
                    newHTML = newHTML.replace(match, replacement);
                    hasReplacements = true;
                    replacedRanges.push({ start: offset, end: offset + match.length });
                }
            });
        });
        
        if (hasReplacements) {
            const span = document.createElement('span');
            span.innerHTML = newHTML;
            node.parentNode.replaceChild(span, node);
        }
    }
    
    function walkNodes(node) {
        if (node.nodeType === Node.ELEMENT_NODE && 
            (node.tagName === 'CODE' || node.tagName === 'PRE' || node.tagName === 'A')) {
            return;
        }
        
        if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
        } else if (node.childNodes) {
            Array.from(node.childNodes).forEach(child => walkNodes(child));
        }
    }
    
    walkNodes(tempDiv);
    return tempDiv.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

function updateStats() {
    // Header stats
    if (elements.messageCount) {
        elements.messageCount.textContent = state.messageCount;
    }
    
    if (elements.avgResponse && state.messageCount > 0) {
        const avg = (state.totalResponseTime / state.messageCount / 1000).toFixed(2);
        elements.avgResponse.textContent = `${avg}s`;
    }
    
    // Panel stats
    if (elements.statMessages) {
        elements.statMessages.textContent = state.messageCount;
    }
    
    if (elements.statAvgTime && state.messageCount > 0) {
        const avg = (state.totalResponseTime / state.messageCount / 1000).toFixed(2);
        elements.statAvgTime.textContent = `${avg}s`;
    }
    
    if (elements.statContext) {
        elements.statContext.textContent = state.conversationHistory.length;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

async function uploadDocument() {
    const text = elements.documentInput?.value.trim();
    
    if (!text) {
        showUploadStatus('Please enter some text to upload', 'error');
        return;
    }
    
    elements.uploadButton.disabled = true;
    elements.uploadButton.innerHTML = '<span>Uploading...</span>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documents: [{
                    id: `doc-${Date.now()}`,
                    text: text,
                    metadata: {
                        uploadedAt: new Date().toISOString(),
                        source: 'web-interface'
                    }
                }],
                namespace: 'ucl-courses'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showUploadStatus('✅ Successfully uploaded document!', 'success');
            elements.documentInput.value = '';
            setTimeout(() => hideUploadStatus(), 3000);
        } else {
            showUploadStatus(`❌ Error: ${data.error || 'Upload failed'}`, 'error');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('❌ Failed to upload. Check server connection.', 'error');
    } finally {
        elements.uploadButton.disabled = false;
        elements.uploadButton.innerHTML = `
            <span>Upload to Knowledge Base</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        `;
    }
}

function showUploadStatus(message, type) {
    if (elements.uploadStatus) {
        elements.uploadStatus.textContent = message;
        elements.uploadStatus.className = `upload-status ${type}`;
    }
}

function hideUploadStatus() {
    if (elements.uploadStatus) {
        elements.uploadStatus.textContent = '';
        elements.uploadStatus.className = 'upload-status';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEAR CHAT
// ═══════════════════════════════════════════════════════════════════════════

function clearChat() {
    // Clear messages except welcome
    const messages = elements.chatMessages.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
    
    // Show welcome experience
    if (elements.welcomeExperience) {
        elements.welcomeExperience.style.display = '';
        elements.welcomeExperience.style.opacity = '1';
        elements.welcomeExperience.style.transform = 'scale(1)';
    }
    
    // Reset state
    state.messageCount = 0;
    state.totalResponseTime = 0;
    state.conversationHistory = [];
    updateStats();
    
    // Button feedback
    const btn = elements.clearChatButton;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '✓ Cleared!';
    btn.style.background = 'rgba(16, 185, 129, 0.2)';
    btn.style.borderColor = '#10b981';
    btn.style.color = '#10b981';
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
    }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATIONS (using Anime.js if available)
// ═══════════════════════════════════════════════════════════════════════════

function animateElement(element, properties) {
    if (typeof anime !== 'undefined') {
        anime({
            targets: element,
            ...properties,
            easing: 'easeOutExpo'
        });
    }
}
