# Tests fonctionnels du module Dashboard (Body Doubling / slots)
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3001/api'
$ct = 'application/json; charset=utf-8'   # force UTF-8 (PS 5.1 encode sinon en Latin-1)
$pass = 0; $fail = 0
function CountOf($items) { return ($items | Measure-Object).Count }
function Check($name, $cond) {
  if ($cond) { $script:pass++; Write-Host "  [PASS] $name" -ForegroundColor Green }
  else       { $script:fail++; Write-Host "  [FAIL] $name" -ForegroundColor Red }
}
function Iso($dt) { return $dt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") }
function Reg($name) {
  $r = Get-Random
  $body = @{ email = "ft_${name}_$r@fb.test"; password = 'password123'; name = $name; tdahType = 'COMBINE' } | ConvertTo-Json
  return Invoke-RestMethod -Uri "$base/auth/register" -Method Post -ContentType $ct -Body $body
}

Write-Host "`n=== Setup utilisateurs ===" -ForegroundColor Cyan
$A = Reg 'Createur'
$B = Reg 'Candidat'
$HA = @{ Authorization = "Bearer $($A.accessToken)" }
$HB = @{ Authorization = "Bearer $($B.accessToken)" }
Check 'Inscription créateur' ($A.accessToken -ne $null)
Check 'Inscription candidat'  ($B.accessToken -ne $null)

Write-Host "`n=== 1. Création des 3 types de sessions ===" -ForegroundColor Cyan
# INSTANT
$inst = Invoke-RestMethod -Uri "$base/slots" -Method Post -Headers $HA -ContentType $ct -Body (@{ type='INSTANT'; duration=25; tasks=@('T'); description='desc instant' } | ConvertTo-Json)
Check 'INSTANT créée (type)'        ($inst.type -eq 'INSTANT')
Check 'INSTANT description sauvée'  ($inst.description -eq 'desc instant')

# SCHEDULED (+1h)
$start = Iso ((Get-Date).AddHours(1))
$sched = Invoke-RestMethod -Uri "$base/slots" -Method Post -Headers $HA -ContentType $ct -Body (@{ type='SCHEDULED'; startTime=$start; duration=50; tasks=@('Rapport') } | ConvertTo-Json)
Check 'SCHEDULED créée'            ($sched.type -eq 'SCHEDULED' -and $sched.status -eq 'OPEN')

# RECURRING (hebdo lun+mer x4)
$rstart = Iso ((Get-Date).AddDays(1))
$rbody = @{ type='RECURRING'; startTime=$rstart; duration=25; tasks=@('Routine'); recurrence=@{ freq='WEEKLY'; days=@(1,3); count=4 } } | ConvertTo-Json -Depth 5
$rec = Invoke-RestMethod -Uri "$base/slots" -Method Post -Headers $HA -ContentType $ct -Body $rbody
Check 'RECURRING série créée'      ($rec.series -eq $true)
Check 'RECURRING 4 occurrences'    ($rec.count -eq 4)
Check 'RECURRING même seriesId'    (($rec.slots | Select-Object -ExpandProperty seriesId -Unique).Count -eq 1)

Write-Host "`n=== 2. Liste & appariement langue ===" -ForegroundColor Cyan
$listB = Invoke-RestMethod -Uri "$base/slots" -Method Get -Headers $HB
Check 'GET /slots renvoie une liste' ($listB.Count -ge 1)
Check 'Champ languageMatch présent'  ($listB[0].PSObject.Properties.Name -contains 'languageMatch')

Write-Host "`n=== 3. Demande -> Confirmation (matchmaking) ===" -ForegroundColor Cyan
$req = Invoke-RestMethod -Uri "$base/slots/$($sched.id)/request" -Method Post -Headers $HB -ContentType $ct -Body (@{ candidateTask='Ma tache' } | ConvertTo-Json)
Check 'Demande envoyée' ($req.request -ne $null)
$mineA = Invoke-RestMethod -Uri "$base/slots/mine" -Method Get -Headers $HA
$pendingSlot = $mineA | Where-Object { $_.id -eq $sched.id }
Check 'Slot passe en PENDING'        ($pendingSlot.status -eq 'PENDING')
Check 'Candidat visible côté créateur' ((CountOf ($pendingSlot.requests | Where-Object { $_.user.id -eq $B.user.id })) -eq 1)

$conf = Invoke-RestMethod -Uri "$base/slots/$($sched.id)/confirm" -Method Post -Headers $HA -ContentType $ct -Body (@{ candidateId=$B.user.id } | ConvertTo-Json)
Check 'Confirmation OK' ($conf.partner.id -eq $B.user.id)
$mineA2 = Invoke-RestMethod -Uri "$base/slots/mine" -Method Get -Headers $HA
$confSlot = $mineA2 | Where-Object { $_.id -eq $sched.id }
Check 'Slot CONFIRMED + partner' ($confSlot.status -eq 'CONFIRMED' -and $confSlot.partnerId -eq $B.user.id)

Write-Host "`n=== 4. Live token ===" -ForegroundColor Cyan
$tok = Invoke-RestMethod -Uri "$base/slots/$($sched.id)/token" -Method Get -Headers $HA
Check 'Token endpoint répond (token ou fallback)' ($tok.roomName -ne $null)

Write-Host "`n=== 5. Complétion + Feedback ===" -ForegroundColor Cyan
$comp = Invoke-RestMethod -Uri "$base/slots/$($sched.id)/complete" -Method Post -Headers $HA
Check 'Complétion OK' ($comp.success -eq $true)
$fb = Invoke-RestMethod -Uri "$base/slots/$($sched.id)/feedback" -Method Post -Headers $HA -ContentType $ct -Body (@{ rating=5; comment='Super'; mood='😄' } | ConvertTo-Json)
Check 'Feedback créé (rating=5)' ($fb.rating -eq 5)
$fbList = Invoke-RestMethod -Uri "$base/slots/$($sched.id)/feedbacks" -Method Get -Headers $HA
Check 'Moyenne feedback calculée' ($fbList.average -eq 5)

Write-Host "`n=== 6. Stats & KPIs ===" -ForegroundColor Cyan
$stats = Invoke-RestMethod -Uri "$base/slots/stats" -Method Get -Headers $HA
Check 'stats.sessions présent'  ($stats.sessions -ne $null)
Check 'stats.user présent'      ($stats.user -ne $null)
Check 'stats.platform présent'  ($stats.platform -ne $null)
Check 'Créateur sessionsCompleted >= 1' ($stats.user.sessionsCompleted -ge 1)
Check 'Points = sessionsCompleted*10' ($stats.user.points -eq ($stats.user.sessionsCompleted * 10))
$kpis = Invoke-RestMethod -Uri "$base/slots/kpis" -Method Get -Headers $HA
Check 'kpis.totals présent' ($kpis.totals -ne $null)

Write-Host "`n=== 7. Édition / Suppression / Annulation ===" -ForegroundColor Cyan
$edSlot = Invoke-RestMethod -Uri "$base/slots" -Method Post -Headers $HA -ContentType $ct -Body (@{ type='SCHEDULED'; startTime=(Iso ((Get-Date).AddHours(3))); duration=25; tasks=@('X') } | ConvertTo-Json)
$ed = Invoke-RestMethod -Uri "$base/slots/$($edSlot.id)" -Method Patch -Headers $HA -ContentType $ct -Body (@{ duration=50; description='maj' } | ConvertTo-Json)
Check 'Édition durée'      ($ed.duration -eq 50)
Check 'Édition description' ($ed.description -eq 'maj')

$cancelSlot = Invoke-RestMethod -Uri "$base/slots" -Method Post -Headers $HA -ContentType $ct -Body (@{ type='SCHEDULED'; startTime=(Iso ((Get-Date).AddHours(4))); duration=25; tasks=@('Y') } | ConvertTo-Json)
$cancel = Invoke-RestMethod -Uri "$base/slots/$($cancelSlot.id)/cancel" -Method Post -Headers $HA
Check 'Annulation OK' ($cancel.message -ne $null)

$delSlot = Invoke-RestMethod -Uri "$base/slots" -Method Post -Headers $HA -ContentType $ct -Body (@{ type='SCHEDULED'; startTime=(Iso ((Get-Date).AddHours(5))); duration=25; tasks=@('Z') } | ConvertTo-Json)
$del = Invoke-RestMethod -Uri "$base/slots/$($delSlot.id)" -Method Delete -Headers $HA
Check 'Suppression OK' ($del.success -eq $true)

Write-Host "`n=== 8. Cas d'erreur (robustesse) ===" -ForegroundColor Cyan
# Re-confirmer un slot déjà confirmé -> 400
try { Invoke-RestMethod -Uri "$base/slots/$($sched.id)/confirm" -Method Post -Headers $HA -ContentType $ct -Body (@{ candidateId=$B.user.id } | ConvertTo-Json); Check 'Re-confirmation rejetée' $false }
catch { Check 'Re-confirmation rejetée (400)' ($_.Exception.Response.StatusCode.value__ -eq 400) }
# Rejoindre son propre créneau -> 400
try { Invoke-RestMethod -Uri "$base/slots/$($edSlot.id)/request" -Method Post -Headers $HA -ContentType $ct -Body (@{} | ConvertTo-Json); Check 'Auto-demande rejetée' $false }
catch { Check 'Auto-demande rejetée (400)' ($_.Exception.Response.StatusCode.value__ -eq 400) }
# Durée invalide -> 400
try { Invoke-RestMethod -Uri "$base/slots" -Method Post -Headers $HA -ContentType $ct -Body (@{ type='SCHEDULED'; startTime=(Iso ((Get-Date).AddHours(6))); duration=42; tasks=@('bad') } | ConvertTo-Json); Check 'Durée invalide rejetée' $false }
catch { Check 'Durée invalide rejetée (400)' ($_.Exception.Response.StatusCode.value__ -eq 400) }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESULTAT : $pass PASS / $fail FAIL" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "========================================" -ForegroundColor Cyan
