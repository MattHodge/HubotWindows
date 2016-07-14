Param
(
    # Name of the Service
    [Parameter(Mandatory=$true)]
    [string]
    $Name,

    [Parameter(Mandatory=$true)]
    [ValidateSet("Restart", "Stop", "Start")]
    [string]
    $Action
)


if (Get-Service -Name $Name -ErrorAction SilentlyContinue)
{
    switch ($Action)
    {
        Restart {
            Restart-Service -Name $Name -Force -ErrorAction Stop
            $cmdResult = "Succesfully restarted service '$($name)'"
        }
        Stop {
            Stop-Service -Name $Name -Force -ErrorAction Stop
            $cmdResult = "Succesfully stopped service '$($name)'"
        }
        Start {
            Start-Service -Name $Name -ErrorAction Stop
            $cmdResult = "Succesfully started service '$($name)'"
        }
    }
}
else
{
    $cmdResult = "No service found with name '$($name)'"
}

return $cmdResult | Out-String