$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)

$nodeCode = @'
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const code = fs.readFileSync("assets/site-data.js", "utf8");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(code, ctx);

const data = ctx.window.PORTFOLIO_DATA;
const rows = [];

function add(type, section, id, title, key, p) {
  if (p === undefined || p === null || p === "") return;
  const exists = fs.existsSync(p);
  const size = exists ? fs.statSync(p).size : null;
  const isVideo = /\.(mp4|m4v|mov)$/i.test(p);
  const status = !exists ? "缺失" : (isVideo && size < 100000 ? "占位/需替换" : "存在");
  rows.push({
    type,
    section,
    id,
    title: title || "",
    key,
    path: p,
    dir: path.dirname(p).replaceAll("\\", "/"),
    filename: path.basename(p),
    exists,
    size,
    status,
  });
}

for (const item of data.heroVideos) {
  add("首屏源视频", "首屏", item.id, "", "source", item.source);
  add("首屏海报", "首屏", item.id, "", "poster", item.poster);
}

for (const group of ["featuredWorks", "experiments"]) {
  for (const item of data[group]) {
    const section = group === "featuredWorks" ? "精选作品" : "其他作品";
    add("作品源视频", section, item.id, item.title, "source", item.source);
    add("作品海报", section, item.id, item.title, "poster", item.poster);
    add("卡片预览视频", section, item.id, item.title, "preview", item.preview);
  }
}

const dirs = new Set(["assets", "assets/posters", "assets/previews", "logo", "tests", "tools"]);
for (const row of rows) {
  if (row.dir && row.dir !== ".") dirs.add(row.dir);
}

const dirRows = [...dirs]
  .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
  .map((dir) => ({ dir, exists: fs.existsSync(dir) && fs.statSync(dir).isDirectory() }));

const expected = [
  "视频文案.xlsx",
  "联系方式.txt",
  "社媒.txt",
  "logo/tinylogo.ai",
  "xiaohongshu-seeklogo.png",
  "xiaohongshu-seeklogo.svg",
  "logo/tinylogo.svg",
];

const expectedRows = expected.map((p) => ({
  path: p,
  exists: fs.existsSync(p),
  size: fs.existsSync(p) ? fs.statSync(p).size : null,
  status: fs.existsSync(p) ? "存在" : "缺失",
}));

console.log(Buffer.from(JSON.stringify({ rows, dirRows, expectedRows }), "utf8").toString("base64"));
'@

$jsonBase64 = ($nodeCode | node -).Trim()
$jsonText = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($jsonBase64))
$data = $jsonText | ConvertFrom-Json
$runtimeRows = @($data.rows)
$missingRuntime = @($runtimeRows | Where-Object { -not $_.exists })
$placeholderSources = @($runtimeRows | Where-Object { $_.exists -and $_.key -eq 'source' -and $_.size -lt 100000 -and $_.path -match '\.(mp4|m4v|mov)$' })
$placeholderPreviews = @($runtimeRows | Where-Object { $_.exists -and $_.key -eq 'preview' -and $_.size -lt 100000 -and $_.path -match '\.(mp4|m4v|mov)$' })
$missingExpected = @($data.expectedRows | Where-Object { -not $_.exists })

$outputDir = Join-Path (Get-Location) 'outputs\file-audit'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$outputPath = Join-Path $outputDir '网站文件缺失与占位清单.xlsx'

function Escape-XmlValue([object]$Value) {
  if ($null -eq $Value) { return '' }
  return ([string]$Value).
    Replace('&', '&amp;').
    Replace('<', '&lt;').
    Replace('>', '&gt;').
    Replace('"', '&quot;').
    Replace("'", '&apos;')
}

function Get-ColumnName([int]$Number) {
  $name = ''
  while ($Number -gt 0) {
    $Number--
    $name = [char](65 + ($Number % 26)) + $name
    $Number = [math]::Floor($Number / 26)
  }
  return $name
}

function New-CellXml([int]$Row, [int]$Column, [object]$Value, [int]$Style) {
  $ref = "$(Get-ColumnName $Column)$Row"
  if ($null -eq $Value -or [string]$Value -eq '') {
    return "<c r=`"$ref`" s=`"$Style`"/>"
  }
  if ($Value -is [int] -or $Value -is [long] -or $Value -is [double] -or $Value -is [decimal]) {
    return "<c r=`"$ref`" s=`"$Style`"><v>$Value</v></c>"
  }
  return "<c r=`"$ref`" t=`"inlineStr`" s=`"$Style`"><is><t xml:space=`"preserve`">$(Escape-XmlValue $Value)</t></is></c>"
}

function New-SheetXml([object[]]$Rows, [int[]]$Widths) {
  $maxRow = [Math]::Max(1, $Rows.Count)
  $maxCol = 1
  foreach ($row in $Rows) {
    if ($row.Count -gt $maxCol) { $maxCol = $row.Count }
  }
  $lastCol = Get-ColumnName $maxCol

  $cols = ''
  for ($i = 1; $i -le $maxCol; $i++) {
    $width = if ($i -le $Widths.Count) { $Widths[$i - 1] } else { 18 }
    $cols += "<col min=`"$i`" max=`"$i`" width=`"$width`" customWidth=`"1`"/>"
  }

  $sheetData = ''
  for ($r = 1; $r -le $Rows.Count; $r++) {
    $row = $Rows[$r - 1]
    $cells = ''
    for ($c = 1; $c -le $maxCol; $c++) {
      $value = if ($c -le $row.Count) { $row[$c - 1] } else { $null }
      $style = if ($r -eq 1) { 1 } elseif ([string]$value -eq '缺失') { 2 } elseif ([string]$value -eq '占位/需替换') { 3 } else { 0 }
      $cells += New-CellXml $r $c $value $style
    }
    $height = if ($r -eq 1) { ' ht="24" customHeight="1"' } else { '' }
    $sheetData += "<row r=`"$r`"$height>$cells</row>"
  }

  $autoFilter = if ($Rows.Count -gt 1) { "<autoFilter ref=`"A1:$lastCol$maxRow`"/>" } else { '' }
  return "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><worksheet xmlns=`"http://schemas.openxmlformats.org/spreadsheetml/2006/main`" xmlns:r=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships`"><sheetViews><sheetView showGridLines=`"0`" workbookViewId=`"0`"><pane ySplit=`"1`" topLeftCell=`"A2`" activePane=`"bottomLeft`" state=`"frozen`"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight=`"18`"/><cols>$cols</cols><sheetData>$sheetData</sheetData>$autoFilter<pageMargins left=`"0.7`" right=`"0.7`" top=`"0.75`" bottom=`"0.75`" header=`"0.3`" footer=`"0.3`"/></worksheet>"
}

$summaryRows = @(
  @('网站文件缺失与占位清单', '', ''),
  @('项目路径', (Get-Location).Path, ''),
  @('生成时间', (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), ''),
  @('项目', '数量', '说明'),
  @('运行期引用总数', $runtimeRows.Count, '来自 assets/site-data.js 的 source/poster/preview'),
  @('运行期缺失引用', $missingRuntime.Count, '应该为 0'),
  @('非运行期缺失源文件', $missingExpected.Count, '文案/联系方式/AI 源文件等'),
  @('占位源视频', $placeholderSources.Count, '当前约 5-7KB，需替换为真实视频'),
  @('占位预览视频', $placeholderPreviews.Count, 'assets/previews 下卡片预览占位'),
  @('架构目录', @($data.dirRows).Count, '网站当前需要的目录结构')
)

$missingRows = @(@('类型', '路径', '状态', '大小(Bytes)', '备注'))
foreach ($row in $missingRuntime) {
  $missingRows += ,@('运行期引用', $row.path, $row.status, $row.size, '来自 assets/site-data.js')
}
foreach ($row in $missingExpected) {
  $missingRows += ,@('非运行期源文件', $row.path, $row.status, $row.size, '不影响当前测试运行，但属于原项目素材/资料')
}
if ($missingRows.Count -eq 1) {
  $missingRows += ,@('无', '无', '存在', '', '未发现缺失')
}

$sourceRows = @(@('板块', 'ID', '标题', '文件夹', '文件名', '路径', '状态', '大小(Bytes)'))
foreach ($row in $placeholderSources) {
  $sourceRows += ,@($row.section, $row.id, $row.title, $row.dir, $row.filename, $row.path, $row.status, $row.size)
}

$previewRows = @(@('板块', 'ID', '标题', '文件夹', '文件名', '路径', '状态', '大小(Bytes)'))
foreach ($row in $placeholderPreviews) {
  $previewRows += ,@($row.section, $row.id, $row.title, $row.dir, $row.filename, $row.path, $row.status, $row.size)
}

$dirRows = @(@('目录', '状态', '备注'))
foreach ($row in $data.dirRows) {
  $dirRows += ,@($row.dir, $(if ($row.exists) { '存在' } else { '缺失' }), '网站运行/构建需要的目录结构')
}

$refRows = @(@('类型', '板块', 'ID', '标题', '字段', '文件夹', '文件名', '路径', '状态', '大小(Bytes)'))
foreach ($row in $runtimeRows) {
  $refRows += ,@($row.type, $row.section, $row.id, $row.title, $row.key, $row.dir, $row.filename, $row.path, $row.status, $row.size)
}

$sheets = @(
  @{ Name = '摘要'; Rows = $summaryRows; Widths = @(24, 64, 70) },
  @{ Name = '缺失文件'; Rows = $missingRows; Widths = @(18, 70, 16, 16, 64) },
  @{ Name = '占位源视频'; Rows = $sourceRows; Widths = @(16, 28, 34, 28, 44, 78, 16, 16) },
  @{ Name = '占位预览视频'; Rows = $previewRows; Widths = @(16, 28, 34, 28, 44, 78, 16, 16) },
  @{ Name = '架构目录'; Rows = $dirRows; Widths = @(42, 16, 46) },
  @{ Name = '运行期引用'; Rows = $refRows; Widths = @(18, 16, 28, 34, 14, 28, 44, 78, 16, 16) }
)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$fileStream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create)
$zip = [System.IO.Compression.ZipArchive]::new($fileStream, [System.IO.Compression.ZipArchiveMode]::Create)
$utf8 = [System.Text.UTF8Encoding]::new($false)

function Add-ZipEntry([string]$Name, [string]$Content) {
  $entry = $zip.CreateEntry($Name)
  $stream = $entry.Open()
  $writer = [System.IO.StreamWriter]::new($stream, $utf8)
  $writer.Write($Content)
  $writer.Dispose()
  $stream.Dispose()
}

$sheetOverrides = ''
for ($i = 1; $i -le $sheets.Count; $i++) {
  $sheetOverrides += "<Override PartName=`"/xl/worksheets/sheet$i.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml`"/>"
}

Add-ZipEntry '[Content_Types].xml' "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Types xmlns=`"http://schemas.openxmlformats.org/package/2006/content-types`"><Default Extension=`"rels`" ContentType=`"application/vnd.openxmlformats-package.relationships+xml`"/><Default Extension=`"xml`" ContentType=`"application/xml`"/><Override PartName=`"/xl/workbook.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml`"/><Override PartName=`"/xl/styles.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml`"/>$sheetOverrides<Override PartName=`"/docProps/core.xml`" ContentType=`"application/vnd.openxmlformats-package.core-properties+xml`"/><Override PartName=`"/docProps/app.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.extended-properties+xml`"/></Types>"
Add-ZipEntry '_rels/.rels' "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Relationships xmlns=`"http://schemas.openxmlformats.org/package/2006/relationships`"><Relationship Id=`"rId1`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument`" Target=`"xl/workbook.xml`"/><Relationship Id=`"rId2`" Type=`"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties`" Target=`"docProps/core.xml`"/><Relationship Id=`"rId3`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties`" Target=`"docProps/app.xml`"/></Relationships>"

$sheetRefs = ''
$bookRels = ''
for ($i = 1; $i -le $sheets.Count; $i++) {
  $sheetRefs += "<sheet name=`"$(Escape-XmlValue $sheets[$i - 1].Name)`" sheetId=`"$i`" r:id=`"rId$i`"/>"
  $bookRels += "<Relationship Id=`"rId$i`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`" Target=`"worksheets/sheet$i.xml`"/>"
}
$styleRelId = $sheets.Count + 1
$bookRels += "<Relationship Id=`"rId$styleRelId`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles`" Target=`"styles.xml`"/>"

Add-ZipEntry 'xl/workbook.xml' "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><workbook xmlns=`"http://schemas.openxmlformats.org/spreadsheetml/2006/main`" xmlns:r=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships`"><workbookPr/><sheets>$sheetRefs</sheets></workbook>"
Add-ZipEntry 'xl/_rels/workbook.xml.rels' "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Relationships xmlns=`"http://schemas.openxmlformats.org/package/2006/relationships`">$bookRels</Relationships>"
Add-ZipEntry 'xl/styles.xml' "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><styleSheet xmlns=`"http://schemas.openxmlformats.org/spreadsheetml/2006/main`"><fonts count=`"2`"><font><b/><sz val=`"10`"/><color rgb=`"FF111827`"/><name val=`"Microsoft YaHei`"/></font><font><b/><sz val=`"10`"/><color rgb=`"FFFFFFFF`"/><name val=`"Microsoft YaHei`"/></font></fonts><fills count=`"5`"><fill><patternFill patternType=`"none`"/></fill><fill><patternFill patternType=`"gray125`"/></fill><fill><patternFill patternType=`"solid`"><fgColor rgb=`"FF1F2937`"/><bgColor indexed=`"64`"/></patternFill></fill><fill><patternFill patternType=`"solid`"><fgColor rgb=`"FFFEE2E2`"/><bgColor indexed=`"64`"/></patternFill></fill><fill><patternFill patternType=`"solid`"><fgColor rgb=`"FFFEF3C7`"/><bgColor indexed=`"64`"/></patternFill></fill></fills><borders count=`"2`"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style=`"thin`"><color rgb=`"FFD1D5DB`"/></bottom><diagonal/></border></borders><cellStyleXfs count=`"1`"><xf numFmtId=`"0`" fontId=`"0`" fillId=`"0`" borderId=`"0`"/></cellStyleXfs><cellXfs count=`"4`"><xf numFmtId=`"0`" fontId=`"0`" fillId=`"0`" borderId=`"1`" xfId=`"0`" applyFont=`"1`" applyBorder=`"1`" applyAlignment=`"1`"><alignment vertical=`"center`" wrapText=`"1`"/></xf><xf numFmtId=`"0`" fontId=`"1`" fillId=`"2`" borderId=`"1`" xfId=`"0`" applyFont=`"1`" applyFill=`"1`" applyBorder=`"1`" applyAlignment=`"1`"><alignment horizontal=`"center`" vertical=`"center`" wrapText=`"1`"/></xf><xf numFmtId=`"0`" fontId=`"0`" fillId=`"3`" borderId=`"1`" xfId=`"0`" applyFont=`"1`" applyFill=`"1`" applyBorder=`"1`" applyAlignment=`"1`"><alignment vertical=`"center`" wrapText=`"1`"/></xf><xf numFmtId=`"0`" fontId=`"0`" fillId=`"4`" borderId=`"1`" xfId=`"0`" applyFont=`"1`" applyFill=`"1`" applyBorder=`"1`" applyAlignment=`"1`"><alignment vertical=`"center`" wrapText=`"1`"/></xf></cellXfs><cellStyles count=`"1`"><cellStyle name=`"Normal`" xfId=`"0`" builtinId=`"0`"/></cellStyles></styleSheet>"

for ($i = 1; $i -le $sheets.Count; $i++) {
  Add-ZipEntry "xl/worksheets/sheet$i.xml" (New-SheetXml $sheets[$i - 1].Rows $sheets[$i - 1].Widths)
}

$now = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
Add-ZipEntry 'docProps/core.xml' "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><cp:coreProperties xmlns:cp=`"http://schemas.openxmlformats.org/package/2006/metadata/core-properties`" xmlns:dc=`"http://purl.org/dc/elements/1.1/`" xmlns:dcterms=`"http://purl.org/dc/terms/`" xmlns:dcmitype=`"http://purl.org/dc/dcmitype/`" xmlns:xsi=`"http://www.w3.org/2001/XMLSchema-instance`"><dc:title>网站文件缺失与占位清单</dc:title><dc:creator>Codex</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type=`"dcterms:W3CDTF`">$now</dcterms:created><dcterms:modified xsi:type=`"dcterms:W3CDTF`">$now</dcterms:modified></cp:coreProperties>"
Add-ZipEntry 'docProps/app.xml' "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Properties xmlns=`"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties`" xmlns:vt=`"http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes`"><Application>Codex</Application></Properties>"

$zip.Dispose()
$fileStream.Dispose()

$verifyZip = [System.IO.Compression.ZipFile]::OpenRead($outputPath)
$entries = @($verifyZip.Entries | Select-Object -ExpandProperty FullName)
$verifyZip.Dispose()

$required = @('[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet6.xml')
foreach ($entry in $required) {
  if ($entries -notcontains $entry) { throw "Missing xlsx entry: $entry" }
}

Get-Item -LiteralPath $outputPath | Select-Object FullName, Length, LastWriteTime
"runtime_missing=$($missingRuntime.Count)"
"non_runtime_missing=$($missingExpected.Count)"
"placeholder_sources=$($placeholderSources.Count)"
"placeholder_previews=$($placeholderPreviews.Count)"
