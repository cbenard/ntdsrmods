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
$buildZip = Join-Path $currentDir "builds/ntdsrmods.zip"
$manifest = Join-Path $buildDir "manifest.json"

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

$json = Get-Content $manifest | Out-String
$ob = ConvertFrom-Json $json

$ob.content_scripts[0].matches = @($hostmask)

Set-Content $manifest (ConvertTo-Json $ob)

ZipFiles $buildZip $buildDir