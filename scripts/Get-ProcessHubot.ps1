Param
(
    # Name of the Process
    [Parameter(Mandatory=$true)]
    $Name
)

$cmdResult = Get-Process -Name $name -ErrorAction Stop

return $cmdResult | Out-String