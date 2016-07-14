Param
(
    # Name of the Service
    [Parameter(Mandatory=$true)]
    [string]
    $Name,

    [Parameter(Mandatory=$true)]
    [ValidateSet("Restart", "Stop", "Start", "Get")]
    [string]
    $Action
)


if (Get-Service -Name $Name -ErrorAction SilentlyContinue)
{
    switch ($Action)
    {
        Restart {
            Restart-Service -Name $Name -Force -ErrorAction Stop
            $cmdResult = "Successfully restarted service '$($name)'"
        }
        Stop {
            Stop-Service -Name $Name -Force -ErrorAction Stop
            $cmdResult = "Successfully stopped service '$($name)'"
        }
        Start {
            Start-Service -Name $Name -ErrorAction Stop
            $cmdResult = "Successfully started service '$($name)'"
        }
        Get {
          $output = Get-Service -Name $Name -ErrorAction Stop
          $cmdResult = "Service '$($name)' ($($output.DisplayName)) is currently $($output.Status)"
        }
    }
}
else
{
    $cmdResult = "No service found with name '$($name)'"
}

return $cmdResult | Out-String
