Github Fun Repository body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; margin: 0; padding: 0; background: #0d1117; color: #c9d1d9; } .container { max-width: 1200px; margin: 0 auto; padding: 20px; } .header { display: flex; align-items: center; margin-bottom: 30px; border-bottom: 1px solid #30363d; padding-bottom: 20px; position: relative; } .github-logo { fill: #c9d1d9; margin-right: 15px; animation: rotate 3s infinite linear; } @keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .stats-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; } .stat-card { backdrop-filter: blur(10px); background: rgba(22, 27, 34, 0.8); border: 1px solid #30363d; border-radius: 6px; padding: 20px; transition: all 0.3s ease; position: relative; overflow: hidden; } .stat-card h3 { background: linear-gradient(45deg, #58a6ff, #88d1f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.4em; } .stat-card::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent); transform: rotate(45deg); animation: shine 3s infinite; } @keyframes shine { 0% { transform: translateX(-100%) rotate(45deg); } 100% { transform: translateX(100%) rotate(45deg); } } .stat-card:hover { transform: translateY(-5px); box-shadow: 0 0 20px rgba(0,255,255,0.1); } .contribution-graph { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 20px; margin-bottom: 30px; } .graph { display: grid; grid-template-columns: repeat(52, 1fr); gap: 3px; } .day { width: 10px; height: 10px; background: #161b22; border: 1px solid #30363d; border-radius: 2px; transition: all 0.3s ease; cursor: pointer; } .day:hover { box-shadow: 0 0 15px #39d353, 0 0 30px #39d353; transform: scale(1.8); transition: all 0.3s ease; z-index: 2; } .repo-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; } .repo-card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 20px; transition: all 0.3s ease; cursor: pointer; position: relative; } .repo-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 4px 20px rgba(0,255,255,0.1); border-color: #58a6ff; } .repo-card::after { content: '↗'; position: absolute; top: 10px; right: 10px; opacity: 0; transition: 0.3s ease; } .repo-card:hover::after { opacity: 1; } .language-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 5px; box-shadow: 0 0 5px currentColor; } .stars { display: flex; align-items: center; color: #8b949e; margin-top: 10px; } .star-icon { fill: #8b949e; margin-right: 5px; transition: 0.3s ease; } .repo-card:hover .star-icon { fill: #f1e05a; transform: scale(1.2); } .tech-stack { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; } .tech-badge { background: #1f2937; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; color: #58a6ff; border: 1px solid #30363d; border: 1px solid #58a6ff; box-shadow: 0 0 5px #58a6ff; transition: all 0.3s ease; } .tech-badge:hover { box-shadow: 0 0 15px #58a6ff; transform: translateY(-2px); } .achievement-badge { position: absolute; top: -10px; right: -10px; background: linear-gradient(45deg, #1f6feb, #58a6ff); color: white; padding: 5px 10px; border-radius: 12px; font-size: 0.8em; transform: rotate(15deg); box-shadow: 0 0 10px rgba(31, 111, 235, 0.5); } @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } } .animate-pulse { animation: pulse 2s infinite; } #particles { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; } .particle { position: absolute; width: 4px; height: 4px; background: #30363d; border-radius: 50%; animation: float linear infinite; } @keyframes float { 0% { transform: translateY(100vh) scale(0); opacity: 0; } 50% { opacity: 0.5; } 100% { transform: translateY(-100px) scale(1); opacity: 0; } } /\* Add typing animation to repository descriptions \*/ .repo-card p { border-right: 2px solid #58a6ff; white-space: nowrap; overflow: hidden; animation: typing 4s steps(40) infinite; } @keyframes typing { 0%, 100% { width: 0 } 50% { width: 100% } }

Advanced Github Portfolio
=========================

Full Stack Developer & Open Source Contributor
----------------------------------------------

🌟 Specialized in AI, Blockchain, and Cloud Architecture 🌟

### Total Impact

2,547 contributions

127 pull requests merged

85 issues resolved

### Community

42 public repositories

168 followers

Active in 15 organizations

### Achievements

🏆 Arctic Code Vault Contributor

⭐ Top 10% Developer 2023

🎯 Pull Shark

### Contribution Activity

Featured

### AI-Powered-Analytics

Enterprise-grade analytics platform with machine learning capabilities

JavaScript

React TensorFlow.js Node.js

3.2k

### Quantum-Computing-Simulator

Visual quantum circuit designer and simulator

Python

Qiskit NumPy WebAssembly

1.8k

### Blockchain-Supply-Chain

Decentralized supply chain management system

Solidity

Ethereum Web3.js IPFS

2.1k

const contributionGraph = document.getElementById('contributionGraph'); const colors = \['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'\]; for (let i = 0; i < 364; i++) { const day = document.createElement('div'); day.className = 'day'; day.style.background = colors\[Math.floor(Math.random() \* colors.length)\]; day.addEventListener('mouseover', (e) => { const date = new Date(); date.setDate(date.getDate() - (364 - i)); const contributions = Math.floor(Math.random() \* 15); const commitMessages = \[ "Implemented new AI features", "Fixed critical security issues", "Optimized database queries", "Added unit tests", "Refactored legacy code" \]; const randomMessage = commitMessages\[Math.floor(Math.random() \* commitMessages.length)\]; e.target.title = \`${contributions} contributions on ${date.toDateString()}\\n${randomMessage}\`; }); contributionGraph.appendChild(day); } document.querySelectorAll('.repo-card').forEach(card => { card.addEventListener('mousemove', (e) => { const rect = card.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; const xRotate = (y - rect.height / 2) / 20; const yRotate = -(x - rect.width / 2) / 20; card.style.transform = \`perspective(1000px) rotateX(${xRotate}deg) rotateY(${yRotate}deg) scale(1.05)\`; }); card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'; }); card.addEventListener('click', () => { card.style.transform = 'scale(0.95)'; setTimeout(() => { card.style.transform = 'translateY(-5px) scale(1.02)'; }, 200); }); }); // Initialize particles container const particlesContainer = document.getElementById('particles'); function createParticle() { const particle = document.createElement('div'); particle.className = 'particle'; particle.style.left = Math.random() \* window.innerWidth + 'px'; particle.style.animationDuration = Math.random() \* 3 + 2 + 's'; particlesContainer.appendChild(particle); setTimeout(() => { particle.remove(); }, 5000); } // Add cleanup for existing particles when creating new ones function cleanupParticles() { while (particlesContainer.firstChild) { particlesContainer.removeChild(particlesContainer.firstChild); } } // Start particle creation with cleanup setInterval(() => { cleanupParticles(); // Clean up old particles periodically createParticle(); }, 200); setInterval(() => { const days = document.querySelectorAll('.day'); const randomDays = Array.from({length: 3}, () => days\[Math.floor(Math.random() \* days.length)\]); randomDays.forEach(day => { day.style.background = colors\[Math.floor(Math.random() \* colors.length)\]; day.style.transform = 'scale(1.2)'; setTimeout(() => { day.style.transform = 'scale(1)'; }, 500); }); }, 2000); // Add sparkle effect to achievement badges document.querySelectorAll('.achievement-badge').forEach(badge => { setInterval(() => { badge.style.transform = 'rotate(15deg) scale(1.1)'; setTimeout(() => { badge.style.transform = 'rotate(15deg) scale(1)'; }, 200); }, 3000); });

