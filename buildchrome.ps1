# http://www.get-command.com/121/transliterating-strings/
function new-transliteratedstring
{
    param ([string] $inputstring, 
    [string] $SourceSet, 
    [string] $DestinationSet)
 
    $sb = new-object System.Text.StringBuilder
    $table = @{}
    $length = [Math]::Min($SourceSet.length,$DestinationSet.length)
    for ($i = 0; $i -lt $length; $i++) {
        $table.add($SourceSet[$i],$DestinationSet[$i])
    }
 
    $inputstring.toCharArray() | 
    %{$char = if ($table.containskey($_)) {$table[$_]} else {$_}
        $sb.append($char) | out-null
    }
    $sb.toString()
}

# http://www.get-command.com/128/rot13ing-a-string/
function Rot13 {
  param ([string] $inputstring)
  new-transliteratedstring `
    $inputstring `
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" `
    "nopqrstuvwxyzabcdefghijklmNOPQRSTUVWXYZABCDEFGHIJKLM"
}

function GetSourceFiles
{
    param ([string] $directory,
           [string[]] $files)
    $outputFiles = @()
    for ($i = 0; $i -lt $files.Length; $i++) {
        $outputFiles += Join-Path $directory $files[$i]
    }

    $outputFiles
}

# http://stackoverflow.com/a/13302548/448
function ZipFiles( $zipfilename, $sourcedir )
{
   [Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem")
   $compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal
   [System.IO.Compression.ZipFile]::CreateFromDirectory($sourcedir,
        $zipfilename, $compressionLevel, $false)
}

$voldemort = Rot13 cvbarreek
$hostmask = "*://*.${voldemort}.com/*"

$currentDir = Split-Path -parent $MyInvocation.MyCommand.Definition
$buildDir = Join-Path $currentDir "builds/chrome"
$buildZip = Join-Path $currentDir "builds/ntdsrmods-chrome.zip"
$manifest = Join-Path $buildDir "manifest.json"
$rot13x = Join-Path $buildDir "assets/js/rot13x.js"

If (Test-Path $buildDir)
{
	Remove-Item $buildDir -Recurse -Force
}
If (Test-Path $buildZip)
{
	Remove-Item $buildZip -Force
}
New-Item -ItemType directory -Path $buildDir

Copy-Item (GetSourceFiles $currentDir @("*.info", "*.md", "*.json", "*.html", "assets")) $buildDir -Recurse

# Set Manifest matching urls
$json = Get-Content $manifest | Out-String
$ob = ConvertFrom-Json $json
$ob.content_scripts[0].matches = @($hostmask)
$json = ConvertTo-Json $ob
$json = $json -replace "(""matches"":  "")(.*)("",)", '"matches": ["$2"],'
$json = $json -replace ".js ", ".js"", """
$json = $json -replace "(""js"":  "")(.*)("",)", '"js": ["$2"],'
$json = $json -replace ".css ", ".css"", """
$json = $json -replace "(""css"":  "")(.*)("",)", '"css": ["$2"],'
$json = $json -replace "\\u003e", ">"
$json = $json -replace "\\u003c", "<"
Set-Content $manifest $json

# Turn off verbose logging
$rot13fileText = Get-Content $rot13x | Out-String
$rot13fileText = $rot13fileText -replace "var logVerbose = true;", "var logVerbose = false;"
Set-Content $rot13x $rot13fileText

ZipFiles $buildZip $buildDir