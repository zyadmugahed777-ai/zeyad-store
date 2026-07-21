const fs = require('fs');
const path = require('path');

const projectRoot = 'd:/played/Zeyad For Business';
const agentsSkillsDir = path.join(projectRoot, '.agents', 'skills');

// Ensure destination exists
if (!fs.existsSync(agentsSkillsDir)) {
    fs.mkdirSync(agentsSkillsDir, { recursive: true });
}

// Function to find all directories containing SKILL.md
function findSkillsFolders(dir, skillsList = []) {
    const files = fs.readdirSync(dir);
    let hasSkillMd = false;
    
    for (const file of files) {
        if (file === '.git') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            findSkillsFolders(fullPath, skillsList);
        } else if (file === 'SKILL.md') {
            hasSkillMd = true;
        }
    }
    
    if (hasSkillMd) {
        skillsList.push(dir);
    }
    
    return skillsList;
}

// Function to calculate directory size
function getDirSize(dir) {
    let size = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            size += getDirSize(fullPath);
        } else {
            size += stat.size;
        }
    }
    return size;
}

// Function to delete media files recursively
function deleteMediaFiles(dir) {
    const mediaExts = ['.png', '.jpg', '.jpeg', '.gif', '.mp4', '.webp', '.svg', '.mov'];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            deleteMediaFiles(fullPath);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (mediaExts.includes(ext)) {
                fs.unlinkSync(fullPath);
                console.log(`Deleted media file: ${fullPath}`);
            }
        }
    }
}

// Function to copy directory recursively
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Main logic
const tmpDirs = ['tmp_mattpocock', 'tmp_everything', 'tmp_karpathy'];

tmpDirs.forEach(tmpDir => {
    const fullTmpPath = path.join(projectRoot, tmpDir);
    if (!fs.existsSync(fullTmpPath)) return;
    
    console.log(`Scanning ${tmpDir}...`);
    const skillsFound = findSkillsFolders(fullTmpPath);
    
    skillsFound.forEach(skillPath => {
        const skillName = path.basename(skillPath);
        const destPath = path.join(agentsSkillsDir, skillName);
        
        console.log(`Installing skill: ${skillName} from ${tmpDir}`);
        
        // Ensure unique name if there is a conflict
        let finalDestPath = destPath;
        let counter = 1;
        while (fs.existsSync(finalDestPath) && destPath !== finalDestPath) {
            finalDestPath = `${destPath}-${counter}`;
            counter++;
        }
        
        copyDir(skillPath, finalDestPath);
    });
});

console.log('All skills copied. Now checking sizes...');

// Check sizes and remove media if > 10MB
const installedSkills = fs.readdirSync(agentsSkillsDir);
const TEN_MB = 10 * 1024 * 1024;

installedSkills.forEach(skillName => {
    const skillPath = path.join(agentsSkillsDir, skillName);
    const stat = fs.statSync(skillPath);
    if (stat.isDirectory()) {
        const size = getDirSize(skillPath);
        if (size > TEN_MB) {
            console.log(`Skill ${skillName} is ${(size / 1024 / 1024).toFixed(2)} MB (>10MB). Removing media...`);
            deleteMediaFiles(skillPath);
            const newSize = getDirSize(skillPath);
            console.log(`New size of ${skillName}: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
        }
    }
});

console.log('Skill installation and optimization complete.');
