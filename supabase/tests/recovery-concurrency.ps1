$ErrorActionPreference = "Stop"
# Run against the isolated Docker stack used for Poker Quest QA.
$container = "supabase_db_poker-quest-stage2-qa"
$id = [guid]::NewGuid().ToString()
$sql = "set role service_role; select public.consume_recovery_authorization('$id');"
$jobs = @()
try {
  $jobs += Start-Job -ArgumentList $container,$sql -ScriptBlock {
    param($db,$query)
    docker exec $db psql -XAtq -U postgres -v ON_ERROR_STOP=1 -c "begin; $query select pg_sleep(3); commit;"
    if ($LASTEXITCODE) { throw "Primeira sessão falhou" }
  }
  $jobs += Start-Job -ArgumentList $container,$sql -ScriptBlock {
    param($db,$query)
    docker exec $db psql -XAtq -U postgres -v ON_ERROR_STOP=1 -c $query
    if ($LASTEXITCODE) { throw "Segunda sessão falhou" }
  }
  $results = @(Receive-Job -Job $jobs -Wait | Where-Object { $_ -in "t","f" })
  if ($results.Count -ne 2 -or ($results -notcontains "t") -or ($results -notcontains "f")) {
    throw "Esperava exatamente um consumo aceito e um recusado."
  }
  Write-Output "Concorrência: um consumo aceito e um recusado."
} finally {
  if ($jobs.Count) { Remove-Job -Job $jobs -Force }
}
