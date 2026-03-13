const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'src/pages/ClientPortal.jsx',
    'src/pages/Packages.jsx',
    'src/pages/PersonalPurchases.jsx',
    'src/pages/OrganizationPurchases.jsx',
    'src/pages/StaffCoachingSessions.jsx',
    'src/pages/StaffCoachingSessionsAdmin.jsx',
    'src/pages/StaffReferrals.jsx',
    'src/pages/EventRegistrations.jsx',
    'src/pages/MemberList.jsx'
];

for (const requestPath of filesToUpdate) {
    const fullPath = path.join(__dirname, requestPath);
    if (!fs.existsSync(fullPath)) {
        console.log(`Skipping ${requestPath} - not found`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;

    // Check if what we're replacing actually exists
    if (!content.includes("timeZone: 'America/Halifax'")) {
        console.log(`Skipping ${requestPath} - no hardcoded Halifax found`);
        continue;
    }

    // Replace hardcoded "timeZone: 'America/Halifax'" string with "timeZone: tz"
    content = content.replace(/timeZone:\s*'America\/Halifax'/g, 'timeZone: tz');

    // Make sure we have useAppSelector to fetch locationTimezone
    if (!content.includes('useAppSelector')) {
        content = content.replace(/import .*?react';\n/, `$&import { useAppSelector } from '../store/hooks';\n`);
    }

    // Inject the timezone fetch logic right inside the main component function definition
    // We look for "function ComponentName()" or "const ComponentName = "
    if (!content.includes('const tz = locationTimezone')) {
        const componentNameMatch = requestPath.match(/\/([^/]+)\.jsx$/);
        if (componentNameMatch) {
            const name = componentNameMatch[1];
            // Match function Name() { or const Name = () => {
            const regex = new RegExp(`(?:function\\s+${name}\\s*\\([^)]*\\)\\s*\\{|const\\s+${name}\\s*=\\s*(?:\\([^)]*\\))?\\s*=>\\s*\\{)`);
            const injectString = `\n    const authState = useAppSelector((state) => state.auth);\n    const locationTimezone = authState?.locationTimezone;\n    const tz = locationTimezone || 'America/Halifax';\n`;

            if (regex.test(content)) {
                content = content.replace(regex, `$&${injectString}`);
            } else {
                // Fallback if we couldn't find the exact component def, look for the first React hook
                content = content.replace(/const \[.*?\] = useState\(/, `${injectString}    $&`);
            }
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`Successfully updated ${requestPath}`);
    }
}
