Param
(
    # Name of the Process
    [Parameter(Mandatory=$true)]
    $Name
)

try
{
    $cmdResult = Get-Process -Name $name -ErrorAction Stop | Select-Object id,processname,cpu,handles
}
catch
{
    $cmdResult = "No process found with name '$($name)'"
}

return $cmdResult