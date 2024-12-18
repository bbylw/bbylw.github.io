const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced Github Portfolio</title>
    <style>
        body {
            font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
            margin: 0;
            padding: 0;
            background: #0d1117;
            color: #c9d1d9;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 1px solid #30363d;
            padding-bottom: 20px;
            position: relative;
        }

        .github-logo {
            fill: #c9d1d9;
            margin-right: 15px;
            animation: rotate 3s infinite linear;
        }

        @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            backdrop-filter: blur(10px);
            background: rgba(22, 27, 34, 0.8);
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 20px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .stat-card h3 {
            background: linear-gradient(45deg, #58a6ff, #88d1f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 1.4em;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
            transform: rotate(45deg);
            animation: shine 3s infinite;
        }

        @keyframes shine {
            0% { transform: translateX(-100%) rotate(45deg); }
            100% { transform: translateX(100%) rotate(45deg); }
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 0 20px rgba(0,255,255,0.1);
        }

        .contribution-graph {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 30px;
        }

        .graph {
            display: grid;
            grid-template-columns: repeat(52, 1fr);
            gap: 3px;
        }

        .day {
            width: 10px;
            height: 10px;
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 2px;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .day:hover {
            box-shadow: 0 0 15px #39d353, 0 0 30px #39d353;
            transform: scale(1.8);
            transition: all 0.3s ease;
            z-index: 2;
        }

        .repo-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .repo-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 20px;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
        }

        .repo-card:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 4px 20px rgba(0,255,255,0.1);
            border-color: #58a6ff;
        }

        .repo-card::after {
            content: '↗';
            position: absolute;
            top: 10px;
            right: 10px;
            opacity: 0;
            transition: 0.3s ease;
        }

        .repo-card:hover::after {
            opacity: 1;
        }

        .language-dot {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 5px;
            box-shadow: 0 0 5px currentColor;
        }

        .stars {
            display: flex;
            align-items: center;
            color: #8b949e;
            margin-top: 10px;
        }

        .star-icon {
            fill: #8b949e;
            margin-right: 5px;
            transition: 0.3s ease;
        }

        .repo-card:hover .star-icon {
            fill: #f1e05a;
            transform: scale(1.2);
        }

        .tech-stack {
            margin-top: 10px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .tech-badge {
            background: #1f2937;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            color: #58a6ff;
            border: 1px solid #30363d;
            border: 1px solid #58a6ff;
            box-shadow: 0 0 5px #58a6ff;
            transition: all 0.3s ease;
        }

        .tech-badge:hover {
            box-shadow: 0 0 15px #58a6ff;
            transform: translateY(-2px);
        }

        .achievement-badge {
            position: absolute;
            top: -10px;
            right: -10px;
            background: linear-gradient(45deg, #1f6feb, #58a6ff);
            color: white;
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            transform: rotate(15deg);
            box-shadow: 0 0 10px rgba(31, 111, 235, 0.5);
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        .animate-pulse {
            animation: pulse 2s infinite;
        }

        #particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        }

        .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: #30363d;
            border-radius: 50%;
            animation: float linear infinite;
        }

        @keyframes float {
            0% {
                transform: translateY(100vh) scale(0);
                opacity: 0;
            }
            50% {
                opacity: 0.5;
            }
            100% {
                transform: translateY(-100px) scale(1);
                opacity: 0;
            }
        }

        .repo-card p {
            border-right: 2px solid #58a6ff;
            white-space: nowrap;
            overflow: hidden;
            animation: typing 4s steps(40) infinite;
        }

        @keyframes typing {
            0%, 100% { width: 0 }
            50% { width: 100% }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <svg class="github-logo" height="32" viewBox="0 0 16 16" width="32">
                <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            <h1>Advanced Github Portfolio</h1>
        </div>
        
        <div class="stats-overview" style="text-align: center; margin-bottom: 30px;">
            <h2 style="background: linear-gradient(45deg, #58a6ff, #88d1f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                Full Stack Developer & Open Source Contributor
            </h2>
            <p style="color: #8b949e;">🌟 Specialized in AI, Blockchain, and Cloud Architecture 🌟</p>
        </div>

        <div class="stats-container">
            <div class="stat-card animate-pulse">
                <h3>Total Impact</h3>
                <p>2,547 contributions</p>
                <p>127 pull requests merged</p>
                <p>85 issues resolved</p>
            </div>
            <div class="stat-card">
                <h3>Community</h3>
                <p>42 public repositories</p>
                <p>168 followers</p>
                <p>Active in 15 organizations</p>
            </div>
            <div class="stat-card">
                <h3>Achievements</h3>
                <p>🏆 Arctic Code Vault Contributor</p>
                <p>⭐ Top 10% Developer 2023</p>
                <p>🎯 Pull Shark</p>
            </div>
        </div>

        <div class="contribution-graph">
            <h3>Contribution Activity</h3>
            <div class="graph" id="contributionGraph"></div>
        </div>

        <div class="repo-list">
            <div class="repo-card">
                <div class="achievement-badge">Featured</div>
                <h3>AI-Powered-Analytics</h3>
                <p>Enterprise-grade analytics platform with machine learning capabilities</p>
                <div>
                    <span class="language-dot" style="background: #f1e05a"></span>
                    JavaScript
                </div>
                <div class="tech-stack">
                    <span class="tech-badge">React</span>
                    <span class="tech-badge">TensorFlow.js</span>
                    <span class="tech-badge">Node.js</span>
                </div>
                <div class="stars">
                    <svg class="star-icon" height="16" viewBox="0 0 16 16" width="16">
                        <path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"></path>
                    </svg>
                    3.2k
                </div>
            </div>
            <div class="repo-card">
                <h3>Quantum-Computing-Simulator</h3>
                <p>Visual quantum circuit designer and simulator</p>
                <div>
                    <span class="language-dot" style="background: #3572A5"></span>
                    Python
                </div>
                <div class="tech-stack">
                    <span class="tech-badge">Qiskit</span>
                    <span class="tech-badge">NumPy</span>
                    <span class="tech-badge">WebAssembly</span>
                </div>
                <div class="stars">
                    <svg class="star-icon" height="16" viewBox="0 0 16 16" width="16">
                        <path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"></path>
                    </svg>
                    1.8k
                </div>
            </div>
            <div class="repo-card">
                <h3>Blockchain-Supply-Chain</h3>
                <p>Decentralized supply chain management system</p>
                <div>
                    <span class="language-dot" style="background: #563d7c"></span>
                    Solidity
                </div>
                <div class="tech-stack">
                    <span class="tech-badge">Ethereum</span>
                    <span class="tech-badge">Web3.js</span>
                    <span class="tech-badge">IPFS</span>
                </div>
                <div class="stars">
                    <svg class="star-icon" height="16" viewBox="0 0 16 16" width="16">
                        <path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"></path>
                    </svg>
                    2.1k
                </div>
            </div>
        </div>
    </div>

    <div id="particles"></div>

    <script>
        const contributionGraph = document.getElementById('contributionGraph');
        const colors = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

        for (let i = 0; i < 364; i++) {
            const day = document.createElement('div');
            day.className = 'day';
            day.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            day.addEventListener('mouseover', (e) => {
                const date = new Date();
                date.setDate(date.getDate() - (364 - i));
                const contributions = Math.floor(Math.random() * 15);
                const commitMessages = [
                    "Implemented new AI features",
                    "Fixed critical security issues",
                    "Optimized database queries",
                    "Added unit tests",
                    "Refactored legacy code"
                ];
                const randomMessage = commitMessages[Math.floor(Math.random() * commitMessages.length)];
                e.target.title = \`\${contributions} contributions on \${date.toDateString()}\\n\${randomMessage}\`;
            });
            
            contributionGraph.appendChild(day);
        }

        document.querySelectorAll('.repo-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const xRotate = (y - rect.height / 2) / 20;
                const yRotate = -(x - rect.width / 2) / 20;
                
                card.style.transform = \`perspective(1000px) rotateX(\${xRotate}deg) rotateY(\${yRotate}deg) scale(1.05)\`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            });
            
            card.addEventListener('click', () => {
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    card.style.transform = 'translateY(-5px) scale(1.02)';
                }, 200);
            });
        });

        const particlesContainer = document.getElementById('particles');

        function createParticle() {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * window.innerWidth + 'px';
            particle.style.animationDuration = Math.random() * 3 + 2 + 's';
            particlesContainer.appendChild(particle);
          
            setTimeout(() => {
                particle.remove();
            }, 5000);
        }

        function cleanupParticles() {
            while (particlesContainer.firstChild) {
                particlesContainer.removeChild(particlesContainer.firstChild);
            }
        }

        setInterval(() => {
            cleanupParticles();
            createParticle();
        }, 200);

        setInterval(() => {
            const days = document.querySelectorAll('.day');
            const randomDays = Array.from({length: 3}, () => days[Math.floor(Math.random() * days.length)]);
            randomDays.forEach(day => {
                day.style.background = colors[Math.floor(Math.random() * colors.length)];
                day.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    day.style.transform = 'scale(1)';
                }, 500);
            });
        }, 2000);

        document.querySelectorAll('.achievement-badge').forEach(badge => {
            setInterval(() => {
                badge.style.transform = 'rotate(15deg) scale(1.1)';
                setTimeout(() => {
                    badge.style.transform = 'rotate(15deg) scale(1)';
                }, 200);
            }, 3000);
        });
    </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}; 