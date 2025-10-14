// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

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

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusElement = document.getElementById('status');
const messageCountElement = document.getElementById('messageCount');
const avgResponseElement = document.getElementById('avgResponse');
const contextSizeElement = document.getElementById('contextSize');
const documentInput = document.getElementById('documentInput');
const uploadButton = document.getElementById('uploadButton');
const uploadStatus = document.getElementById('uploadStatus');
const themeToggle = document.getElementById('themeToggle');
const clearChatButton = document.getElementById('clearChatButton');

// State
let messageCount = 0;
let totalResponseTime = 0;
let conversationHistory = []; // Store conversation history for context
const MAX_HISTORY_LENGTH = 20; // Maximum number of messages to keep in history (10 exchanges)

// Initialize
checkServerStatus();
initializeTheme();

// Create animated AI icon using Anime.js
function createAnimatedAIIcon(container) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    
    // Create brain/circuit pattern
    const brain = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    brain.setAttribute('cx', '20');
    brain.setAttribute('cy', '20');
    brain.setAttribute('r', '16');
    brain.setAttribute('fill', 'none');
    brain.setAttribute('stroke', '#00e5ff');
    brain.setAttribute('stroke-width', '2');
    brain.setAttribute('opacity', '0.8');
    
    // Create neural nodes
    const nodes = [];
    for (let i = 0; i < 6; i++) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const angle = (i * Math.PI * 2) / 6;
        const radius = 12;
        const x = 20 + Math.cos(angle) * radius;
        const y = 20 + Math.sin(angle) * radius;
        
        node.setAttribute('cx', x);
        node.setAttribute('cy', y);
        node.setAttribute('r', '2');
        node.setAttribute('fill', '#00bdee');
        node.setAttribute('class', `neural-node node-${i}`);
        nodes.push(node);
        svg.appendChild(node);
    }
    
    // Create connecting lines
    const connections = [];
    for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        const angle1 = (i * Math.PI * 2) / 6;
        const angle2 = (next * Math.PI * 2) / 6;
        const radius = 12;
        
        const x1 = 20 + Math.cos(angle1) * radius;
        const y1 = 20 + Math.sin(angle1) * radius;
        const x2 = 20 + Math.cos(angle2) * radius;
        const y2 = 20 + Math.sin(angle2) * radius;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#00bdee');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('opacity', '0.6');
        line.setAttribute('class', `connection connection-${i}`);
        connections.push(line);
        svg.appendChild(line);
    }
    
    svg.appendChild(brain);
    container.appendChild(svg);
    
    // Animate the elements
    const animateIcon = () => {
        // Animate nodes pulsing
        anime({
            targets: '.neural-node',
            scale: [1, 1.5, 1],
            opacity: [0.8, 1, 0.8],
            duration: 2000,
            delay: anime.stagger(200),
            loop: true,
            easing: 'easeInOutSine'
        });
        
        // Animate connections
        anime({
            targets: '.connection',
            opacity: [0.3, 1, 0.3],
            strokeWidth: [1, 2, 1],
            duration: 3000,
            delay: anime.stagger(300),
            loop: true,
            easing: 'easeInOutSine'
        });
        
        // Animate brain outline
        anime({
            targets: brain,
            strokeDasharray: [0, 100],
            strokeDashoffset: [0, -100],
            duration: 4000,
            loop: true,
            easing: 'linear'
        });
    };
    
    // Start animation after a short delay
    setTimeout(animateIcon, 100);
    
    return svg;
}

// Create custom animated loading element
function createCustomLoadingAnimation(container) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 36 12');
    svg.setAttribute('width', '36px');
    svg.setAttribute('height', '12px');
    svg.style.margin = '0 auto';
    svg.style.display = 'block';
    
    // Create 3 animated circles
    for (let i = 0; i < 3; i++) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', 6 + (i * 12));
        circle.setAttribute('cy', '6');
        circle.setAttribute('r', '2.5');
        circle.setAttribute('fill', '#00bdee');
        circle.setAttribute('opacity', '0.6');
        circle.setAttribute('class', `loading-circle loading-circle-${i}`);
        svg.appendChild(circle);
    }
    
    container.appendChild(svg);
    
    // Animate the loading circles
    const animateLoading = () => {
        // Staggered bounce animation - reduced movement
        anime({
            targets: '.loading-circle',
            translateY: [-4, -8, -4],
            scale: [1, 1.3, 1],
            opacity: [0.6, 1, 0.6],
            duration: 1000,
            delay: anime.stagger(120),
            loop: true,
            easing: 'easeInOutSine'
        });
        
        // Add a subtle glow effect
        anime({
            targets: '.loading-circle',
            filter: [
                'drop-shadow(0 0 2px rgba(0, 189, 238, 0.3))',
                'drop-shadow(0 0 6px rgba(0, 189, 238, 0.8))',
                'drop-shadow(0 0 2px rgba(0, 189, 238, 0.3))'
            ],
            duration: 1000,
            delay: anime.stagger(120),
            loop: true,
            easing: 'easeInOutSine'
        });
    };
    
    // Start animation
    setTimeout(animateLoading, 100);
    
    return svg;
}

// Configure marked.js for better rendering
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
    });
}

// Function to add tooltips to academic terms
function addAcademicTooltips(htmlContent) {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Function to process text nodes
    function processTextNode(node) {
        if (node.nodeType !== Node.TEXT_NODE) return;
        
        let text = node.textContent;
        let hasReplacements = false;
        let newHTML = text;
        
        // Sort terms by length (longest first) to avoid partial matches
        const terms = Object.keys(ACADEMIC_GLOSSARY).sort((a, b) => b.length - a.length);
        
        // Track positions of already replaced terms to avoid overlapping
        const replacedRanges = [];
        
        terms.forEach(term => {
            // Create a case-insensitive regex with word boundaries
            const regex = new RegExp(`\\b(${term})\\b`, 'gi');
            
            text.replace(regex, (match, capture, offset) => {
                // Check if this position overlaps with already replaced ranges
                const overlaps = replacedRanges.some(range => 
                    (offset >= range.start && offset < range.end) ||
                    (offset + match.length > range.start && offset + match.length <= range.end)
                );
                
                if (!overlaps) {
                    const definition = ACADEMIC_GLOSSARY[term.toLowerCase()];
                    const replacement = `<span class="academic-term">${match}<span class="tooltip">${definition}</span></span>`;
                    
                    // Replace in newHTML
                    newHTML = newHTML.replace(match, replacement);
                    hasReplacements = true;
                    
                    // Track this replacement
                    replacedRanges.push({
                        start: offset,
                        end: offset + match.length
                    });
                }
            });
        });
        
        if (hasReplacements) {
            const span = document.createElement('span');
            span.innerHTML = newHTML;
            node.parentNode.replaceChild(span, node);
        }
    }
    
    // Recursively process all text nodes, but skip code blocks and links
    function walkNodes(node) {
        // Skip code elements, pre elements, and links
        if (node.nodeType === Node.ELEMENT_NODE && 
            (node.tagName === 'CODE' || node.tagName === 'PRE' || node.tagName === 'A')) {
            return;
        }
        
        if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
        } else if (node.childNodes) {
            // Convert to array to avoid issues with live NodeList
            Array.from(node.childNodes).forEach(child => walkNodes(child));
        }
    }
    
    walkNodes(tempDiv);
    return tempDiv.innerHTML;
}

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
});

// Send message on Enter (Shift+Enter for new line)
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Send button click
sendButton.addEventListener('click', sendMessage);

// Upload button click
uploadButton.addEventListener('click', uploadDocument);

// Theme toggle click
themeToggle.addEventListener('click', toggleTheme);

// Clear chat button click
clearChatButton.addEventListener('click', clearChat);

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (data.status === 'ok' && data.pineconeConnected) {
            updateStatus('connected', 'Connected');
        } else {
            updateStatus('error', 'Not Connected');
        }
    } catch (error) {
        console.error('Error checking server status:', error);
        updateStatus('error', 'Server Offline');
    }
}

// Update status indicator
function updateStatus(status, text) {
    statusElement.className = `status-indicator ${status}`;
    statusElement.querySelector('.status-text').textContent = text;
}

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Remove welcome message if it exists
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    // Add user message
    addMessage('user', message);
    
    // Disable input while processing
    messageInput.disabled = true;
    sendButton.disabled = true;
    
    // Show loading indicator
    const loadingId = addLoadingMessage();
    
    const startTime = Date.now();
    
    try {
        // Add user message to conversation history
        conversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Trim conversation history if it exceeds maximum length
        // Keep only the most recent messages
        if (conversationHistory.length > MAX_HISTORY_LENGTH) {
            conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
        }
        
        console.log(`💬 Sending message with ${conversationHistory.length} messages in context`);
        
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message,
                conversationHistory: conversationHistory, // Send conversation history for context
                namespace: 'ucl-courses' // Query the course data namespace
            }),
        });
        
        const data = await response.json();
        
        const responseTime = Date.now() - startTime;
        
        // Remove loading indicator
        removeLoadingMessage(loadingId);
        
        if (response.ok) {
            // Add assistant message with sources
            addMessage('assistant', data.response, data.sources);
            
            // Add assistant response to conversation history
            conversationHistory.push({
                role: 'assistant',
                content: data.response
            });
            
            // Update stats
            messageCount++;
            totalResponseTime += responseTime;
            updateStats();
        } else {
            const errorMessage = `Error: ${data.error || 'Something went wrong'}`;
            addMessage('assistant', errorMessage, null, true);
            
            // Add error to conversation history as well
            conversationHistory.push({
                role: 'assistant',
                content: errorMessage
            });
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeLoadingMessage(loadingId);
        const errorMessage = 'Sorry, I encountered an error. Please make sure the server is running.';
        addMessage('assistant', errorMessage, null, true);
        
        // Add error to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: errorMessage
        });
    } finally {
        // Re-enable input
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Add message to chat
function addMessage(role, content, sources = null, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (role === 'user') {
        avatar.textContent = '👤';
    } else {
        // Add animated AI icon
        avatar.classList.add('ai-avatar');
        const iconContainer = document.createElement('div');
        iconContainer.style.width = '100%';
        iconContainer.style.height = '100%';
        iconContainer.style.position = 'relative';
        iconContainer.style.pointerEvents = 'none';
        
        // Create animated AI icon
        createAnimatedAIIcon(iconContainer);
        avatar.appendChild(iconContainer);
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Format content based on role
    if (role === 'assistant' && typeof marked !== 'undefined') {
        // Parse markdown for assistant messages
        const markdownHTML = marked.parse(content);
        // Add tooltips to academic terms
        bubble.innerHTML = addAcademicTooltips(markdownHTML);
    } else {
        // Plain text for user messages
        bubble.textContent = content;
    }
    
    if (isError) {
        bubble.style.background = 'rgba(239, 68, 68, 0.2)';
        bubble.style.borderLeft = '3px solid #ef4444';
    }
    
    messageContent.appendChild(bubble);
    
    // Sources are hidden by default
    // Uncomment below to show sources with each response
    /*
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'message-sources';
        
        const sourcesTitle = document.createElement('div');
        sourcesTitle.className = 'message-sources-title';
        sourcesTitle.textContent = '📚 Sources:';
        sourcesDiv.appendChild(sourcesTitle);
        
        sources.forEach(source => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.textContent = `[${source.id}] Score: ${(source.score * 100).toFixed(1)}% - ${source.text}`;
            sourcesDiv.appendChild(sourceItem);
        });
        
        messageContent.appendChild(sourcesDiv);
    }
    */
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Animation is automatically started in createAnimatedAIIcon
    
    return messageDiv;
}

// Add loading indicator
function addLoadingMessage() {
    const loadingId = `loading-${Date.now()}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = loadingId;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai-avatar';
    
    // Add animated AI icon
    const iconContainer = document.createElement('div');
    iconContainer.style.width = '100%';
    iconContainer.style.height = '100%';
    iconContainer.style.position = 'relative';
    iconContainer.style.pointerEvents = 'none';
    
    // Create animated AI icon
    createAnimatedAIIcon(iconContainer);
    avatar.appendChild(iconContainer);
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'custom-loading';
    
    // Create animated loading elements
    createCustomLoadingAnimation(loadingContainer);
    
    bubble.appendChild(loadingContainer);
    messageContent.appendChild(bubble);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Animation is automatically started in createAnimatedAIIcon
    
    return loadingId;
}

// Remove loading indicator
function removeLoadingMessage(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Update stats
function updateStats() {
    messageCountElement.textContent = messageCount;
    contextSizeElement.textContent = conversationHistory.length;
    
    if (messageCount > 0) {
        const avgTime = (totalResponseTime / messageCount / 1000).toFixed(2);
        avgResponseElement.textContent = `${avgTime}s`;
    }
}

// Upload document
async function uploadDocument() {
    const text = documentInput.value.trim();
    
    if (!text) {
        showUploadStatus('Please enter some text to upload', 'error');
        return;
    }
    
    // Disable button while uploading
    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documents: [
                    {
                        id: `doc-${Date.now()}`,
                        text: text,
                        metadata: {
                            uploadedAt: new Date().toISOString(),
                            source: 'web-interface'
                        }
                    }
                ],
                namespace: 'ucl-courses' // Upload to course data namespace
            }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showUploadStatus(`✅ Successfully uploaded document!`, 'success');
            documentInput.value = '';
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                uploadStatus.textContent = '';
                uploadStatus.className = 'upload-status';
            }, 3000);
        } else {
            showUploadStatus(`❌ Error: ${data.error || 'Upload failed'}`, 'error');
        }
        
    } catch (error) {
        console.error('Error uploading document:', error);
        showUploadStatus('❌ Failed to upload. Check server connection.', 'error');
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload Document';
    }
}

// Show upload status message
function showUploadStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `upload-status ${type}`;
}

// Theme Management
function initializeTheme() {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    } else if (!savedTheme) {
        // Default to dark mode if no preference is saved
        localStorage.setItem('theme', 'dark');
    }
}

function toggleTheme() {
    const isLightMode = document.body.classList.toggle('light-mode');
    
    // Save preference to localStorage
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
    
    // Add a subtle animation effect
    themeToggle.style.transform = 'scale(0.9)';
    setTimeout(() => {
        themeToggle.style.transform = '';
    }, 100);
}

// Clear chat functionality
function clearChat() {
    // Remove all messages except welcome message
    const messages = chatMessages.querySelectorAll('.message');
    messages.forEach(message => message.remove());
    
    // Re-add welcome message
    const welcomeHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h2>Welcome to Nexus</h2>
            <p>Your intelligent course assistant powered by advanced AI and semantic search.</p>
            <p>Ask me about courses, modules, assessments, or any academic information.</p>
        </div>
    `;
    chatMessages.innerHTML = welcomeHTML;
    
    // Reset stats and conversation history
    messageCount = 0;
    totalResponseTime = 0;
    conversationHistory = []; // Clear conversation history
    updateStats();
    
    // Show confirmation
    const originalText = clearChatButton.textContent;
    clearChatButton.textContent = '✓ Cleared!';
    clearChatButton.style.background = 'rgba(16, 185, 129, 0.2)';
    clearChatButton.style.borderColor = '#10b981';
    clearChatButton.style.color = '#10b981';
    
    setTimeout(() => {
        clearChatButton.textContent = originalText;
        clearChatButton.style.background = '';
        clearChatButton.style.borderColor = '';
        clearChatButton.style.color = '';
    }, 2000);
}

// Periodically check server status
setInterval(checkServerStatus, 30000); // Check every 30 seconds
