# Build all C++ projects to WASM
# Run from: cpp/ or workspace root
# Requires: emcc in PATH (run emsdk_env.bat first, or activate emsdk)

param(
    [string]$OutputDir = "$PSScriptRoot\..\public\wasm"
)

$ErrorActionPreference = "Stop"

# Ensure output directory exists
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Find all project directories (each must have a main.cpp)
$projects = Get-ChildItem -Path $PSScriptRoot -Directory

foreach ($project in $projects) {
    $mainFile = Join-Path $project.FullName "main.cpp"
    if (-not (Test-Path $mainFile)) { continue }

    $name = $project.Name
    $outJs = Join-Path $OutputDir "$name.js"
    $outWasm = Join-Path $OutputDir "$name.wasm"

    Write-Host "Building $name..." -ForegroundColor Cyan

    # Collect all .cpp files in the project directory
    $sources = Get-ChildItem -Path $project.FullName -Filter "*.cpp" -Recurse |
    ForEach-Object { $_.FullName }

    # Load per-project extra flags from build-flags.json if present
    $extraFlags = @()
    $flagsFile = Join-Path $project.FullName "build-flags.json"
    if (Test-Path $flagsFile) {
        $flagsJson = Get-Content $flagsFile | ConvertFrom-Json
        $extraFlags = $flagsJson.extra_flags
        Write-Host "  Using extra flags: $extraFlags" -ForegroundColor DarkGray
    }

    & emcc $sources `
        -o $outJs `
        -s WASM=1 `
        "-s" "EXPORTED_RUNTIME_METHODS=['cwrap','ccall']" `
        -s MODULARIZE=1 `
        "-s" "EXPORT_NAME='${name}Module'" `
        -s ALLOW_MEMORY_GROWTH=1 `
        -O2 `
        --std=c++20 `
        @extraFlags

    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $name" -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "Done: $outJs + $outWasm" -ForegroundColor Green
}

Write-Host "`nAll WASM builds complete." -ForegroundColor Green
