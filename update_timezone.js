const fs = require('fs');

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

for (const file of filesToUpdate) {
    if (!fs.existsSync(file)) {
        console.log(`Skipping ${file} - not found`);
        continue;
    }

    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Replace hardcoded "timeZone: 'America/Halifax'" string with "timeZone: tz"
    content = content.replace(/timeZone:\s*'America\/Halifax'/g, 'timeZone: tz');

    // remove timezone.js imports
    content = content.replace(/import\s*\{\s*[^}]*\b(?:halifaxTimeToUTC|utcTimeToLocal|utcToHalifaxDate)\b[^}]*\}\s*from\s*'[^']*timezone';\s*\n?/g, '');

    // Special handling for ClientPortal missing the hook
    if (file.includes('ClientPortal.jsx')) {
        if (!content.includes('timezoneUtils')) {
            content = content.replace(/import \{ Badge \}.*\n?/, `$&import { formatLocalTime, formatLocalDate } from '../utils/timezoneUtils';\n`);
        }
        if (!content.includes('const tz = locationTimezone')) {
            content = content.replace(/const \{ popup, openPopup, closePopup \} = usePopup\(\);/, `$&
    const { locationTimezone } = useAppSelector((state) => state.auth);
    const tz = locationTimezone || 'America/Halifax';`);
        }
    } else {
        // Add import for timezoneUtils if needed
        if (!content.includes('timezoneUtils') && content !== originalContent) {
            content = content.replace(/import React.*?\n/, `$&import { formatLocalTime, formatLocalDate } from '../utils/timezoneUtils';\n`);
        }

        // Add useAppSelector if not present
        if (!content.includes('useAppSelector') && content !== originalContent) {
            content = content.replace(/import \{.*?\}.*?react-redux';\n?/g, '');
            content = content.replace(/import React.*?\n/, `$&import { useAppSelector } from '../store/hooks';\n`);
        }

        // Add tz variable extraction if not present
        if (!content.includes('const tz = locationTimezone') && content.includes('timeZone: tz')) {
            // Find the component definition
            const functionMatch = content.match(/function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/);
            if (functionMatch) {
                content = content.replace(functionMatch[0], `$&
    const authState = useAppSelector((state) => state.auth);
    const locationTimezone = authState?.locationTimezone;
    const tz = locationTimezone || 'America/Halifax';`);
            } else {
                const constMatch = content.match(/const\s+[A-Za-z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{/);
                if (constMatch) {
                    content = content.replace(constMatch[0], `$&
    const authState = useAppSelector((state) => state.auth);
    const locationTimezone = authState?.locationTimezone;
    const tz = locationTimezone || 'America/Halifax';`);
                }
            }
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    } else {
        console.log(`No changes needed for ${file}`);
    }
}
