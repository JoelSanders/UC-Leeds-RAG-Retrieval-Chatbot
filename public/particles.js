/**
 * Ambient Particle System
 * Creates a beautiful floating particle effect in the background
 */

class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.connections = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.animationId = null;
        
        // Configuration
        this.config = {
            particleCount: 80,
            particleMinSize: 1,
            particleMaxSize: 3,
            particleSpeed: 0.3,
            connectionDistance: 150,
            connectionOpacity: 0.15,
            particleColor: { r: 0, g: 189, b: 238 }, // Primary blue
            accentColor: { r: 0, g: 229, b: 255 },   // Cyan accent
        };
        
        this.init();
    }
    
    init() {
        this.resize();
        this.createParticles();
        this.bindEvents();
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticles() {
        this.particles = [];
        
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * (this.config.particleMaxSize - this.config.particleMinSize) + this.config.particleMinSize,
                speedX: (Math.random() - 0.5) * this.config.particleSpeed,
                speedY: (Math.random() - 0.5) * this.config.particleSpeed,
                opacity: Math.random() * 0.5 + 0.3,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.02 + 0.01,
                isAccent: Math.random() > 0.8
            });
        }
    }
    
    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createParticles();
        });
        
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
        
        // Reduce particles in light mode for better visibility
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isLightMode = document.body.classList.contains('light-mode');
                    this.config.connectionOpacity = isLightMode ? 0.08 : 0.15;
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
    }
    
    updateParticles() {
        this.particles.forEach(particle => {
            // Update pulse
            particle.pulse += particle.pulseSpeed;
            
            // Calculate pulsing opacity
            const pulseOpacity = (Math.sin(particle.pulse) + 1) / 2;
            particle.currentOpacity = particle.opacity * (0.5 + pulseOpacity * 0.5);
            
            // Move particle
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Mouse interaction - particles gently move away from cursor
            if (this.mouse.x !== null && this.mouse.y !== null) {
                const dx = this.mouse.x - particle.x;
                const dy = this.mouse.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.mouse.radius) {
                    const force = (this.mouse.radius - distance) / this.mouse.radius;
                    particle.x -= dx * force * 0.02;
                    particle.y -= dy * force * 0.02;
                }
            }
            
            // Boundary wrapping
            if (particle.x < -10) particle.x = this.canvas.width + 10;
            if (particle.x > this.canvas.width + 10) particle.x = -10;
            if (particle.y < -10) particle.y = this.canvas.height + 10;
            if (particle.y > this.canvas.height + 10) particle.y = -10;
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            const color = particle.isAccent ? this.config.accentColor : this.config.particleColor;
            
            // Draw particle glow
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 3
            );
            gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.currentOpacity})`);
            gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Draw particle core
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.currentOpacity * 1.5})`;
            this.ctx.fill();
        });
    }
    
    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.config.connectionDistance) {
                    const opacity = (1 - distance / this.config.connectionDistance) * this.config.connectionOpacity;
                    const color = this.config.particleColor;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }
        
        // Draw connections to mouse
        if (this.mouse.x !== null && this.mouse.y !== null) {
            this.particles.forEach(particle => {
                const dx = this.mouse.x - particle.x;
                const dy = this.mouse.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.mouse.radius) {
                    const opacity = (1 - distance / this.mouse.radius) * 0.3;
                    const color = this.config.accentColor;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            });
        }
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.updateParticles();
        this.drawConnections();
        this.drawParticles();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Initialize particle system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ParticleSystem('particleCanvas');
});

