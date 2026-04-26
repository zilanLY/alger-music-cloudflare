# Bulk patch script to remove Electron dependencies from web source
# This replaces Electron-specific code patterns with web-safe equivalents

$src = "C:\Users\Administrator\.qclaw\workspace-agent-73d4a4bf\alger-music-cloudflare\web\src"
$files = Get-ChildItem $src -Recurse -File -Include "*.ts","*.vue"
$count = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    
    # Pattern 1: `if (isElectron) { ... }` - replace entire block with nothing
    # This is too complex for regex, so we do simpler replacements
    
    # Pattern: `window.electron` → `undefined` (since polyfill sets it)
    $content = $content -replace 'window\.electron\.ipcRenderer\.sendSync\([^)]+\)', 'null'
    $content = $content -replace 'window\.electron\.ipcRenderer\.on\([^,]+,\s*[^)]+\)', ''
    $content = $content -replace 'window\.electron\.ipcRenderer\.send\([^)]+\)', ''
    $content = $content -replace 'window\.electron', 'undefined'
    
    # Pattern: `window.api.xxx()` → `Promise.resolve(null)` 
    $content = $content -replace 'window\.api\.sendSong\([^)]+\)', 'null'
    $content = $content -replace 'window\.api\.onLanguageChanged\([^)]+\)', ''
    $content = $content -replace 'window\.api\.getSearchSuggestions\([^)]+\)', 'Promise.resolve({data:[]})'
    $content = $content -replace 'window\.api\.\w+\([^)]*\)', 'Promise.resolve(null)'
    
    # Pattern: `if (isElectron)` → `if (false)`
    $content = $content -replace '\bisElectron\b', 'false'
    
    # Pattern: Remove Electron-only imports
    $content = $content -replace "import\s+\{[^}]*isElectron[^}]*\}\s+from\s+'@/utils';", "import { isMobile } from '@/utils';"
    $content = $content -replace ",\s*isElectron", ""
    $content = $content -replace "isElectron,\s*", ""
    
    # Pattern: ipcRenderer direct references
    $content = $content -replace 'ipcRenderer\.\w+\([^)]*\)', 'null'
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        $count++
        $relPath = $file.FullName.Substring($src.Length + 1)
        Write-Output "Patched: $relPath"
    }
}

Write-Output "`nTotal files patched: $count"
