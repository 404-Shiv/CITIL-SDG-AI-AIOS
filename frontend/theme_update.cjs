const fs = require('fs');
const path = require('path');

const files = [
    'src/index.css',
    'src/pages/StudentDashboard.jsx',
    'src/pages/TeacherDashboard.jsx'
];

const replacements = [
    ['var(--accent-purple)', 'var(--accent-yellow)'],
    ['--accent-purple: #7c5cfc;', '--accent-yellow: #fbbf24;'],
    ['--accent-purple: #fcd34d;', '--accent-yellow: #fbbf24;'], // Just in case
    ['#8b5cf6', '#fbbf24'],
    ['#a78bfa', '#fcd34d'],
    ['rgba(139, 92, 246', 'rgba(251, 191, 36'],
    ['rgba(139,92,246', 'rgba(251,191,36'],
    ['rgba(124, 92, 252', 'rgba(251, 191, 36'],
    ['rgba(124,92,252', 'rgba(251,191,36'],
    ['#7c5cfc', '#fbbf24']
];

for (const file of files) {
    const fullPath = path.join('C:\\Users\\shivs\\OneDrive\\Desktop\\SSR\\Projects\\SDG HACKATHON\\frontend', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        for (const [target, replacement] of replacements) {
            content = content.split(target).join(replacement);
        }
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
    } else {
        console.log(`File not found: ${fullPath}`);
    }
}
