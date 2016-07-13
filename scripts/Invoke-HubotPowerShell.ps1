<#
.Synopsis
   A function to execute other PowerShell functions and return the output to Hubot Scripts.
.DESCRIPTION
   A function to execute other PowerShell functions and return the output to Hubot Scripts.
.EXAMPLE
   $myhashtable = @{ Name = 'Explorer' }
   Invoke-HubotPowerShell -FilePath .\Get-ProcessHubot.ps1 -Splat $myhashtable
#>
function Invoke-HubotPowerShell
{
    [CmdletBinding()]
    [OutputType([string])]
    Param
    (
        # FilePath of the PowerShell script to execute
        [Parameter(Mandatory=$true)]
        [ValidateScript({
        if(Test-Path -Path $_ -ErrorAction SilentlyContinue)
        {
            return $true
        }
        else
        {
            throw "$($_) is not a valid path."
        }
        })]
        [string]$FilePath,

        # Splat of the paramaters to pass to the script
        [Parameter(Mandatory=$false)]
        [System.Collections.Hashtable]
        $Splat,

        # ComputerName if running the command remotely over WinRM
        [Parameter(Mandatory=$false)]
        [string]
        $ComputerName,

        # Port if running the command remotely over WinRM
        [Parameter(Mandatory=$false)]
        [int]
        $Port = 5985,

        # Port if running the command remotely over WinRM
        [Parameter(Mandatory=$false)]
        [PSCredential]
        $Credential
    )

    # Set the erroraction
    $ErrorActionPreference = 'Stop'


    # Create a hashtable for the results
    $result = @{}
    
    # Use try/catch block            
    try
    {
        $newPSSessionSplat = @{}

        if ($PSBoundParameters.ContainsKey('Port'))
        {
            $newPSSessionSplat.Port = $Port
        }

        if ($PSBoundParameters.ContainsKey('Credential'))
        {
            $newPSSessionSplat.Credential = $Credential
        }

        if ($PSBoundParameters.ContainsKey('ComputerName'))
        {
            $newPSSessionSplat.ComputerName = $ComputerName

            # splat the new session params
            $s = New-PSSession @newPSSessionSplat    
        }

        $paramObj = New-Object PSObject -Property @{
            script = Get-Command $FilePath | Select-Object -ExpandProperty ScriptBlock
            splat = $Splat
        }
        
        if ($PSBoundParameters.ContainsKey('ComputerName'))
        {
            $scriptOutput = Invoke-Command -Session $s -ArgumentList @($paramObj) -ErrorAction Stop -ScriptBlock {
                $paramObj = $args[0]
                $splat = $paramObj.splat
                New-Item -Path Function:\Hubot-Function -Value $paramObj.script -Force | Out-Null
                Hubot-Function @splat
            }
        }
        else
        {
            $scriptOutput = .$paramObj.script @Splat
        }
                      
        # Create a string for sending back to slack. * and ` are used to make the output look nice in Slack. Details: http://bit.ly/MHSlackFormat
        $result.output = $scriptOutput
        $result.output = $result.output -creplace '(?m)^\s*\r?\n',''
        
        # Set a successful result
        $result.success = $true
    }
    catch
    {
        $result.error = @{}
        if ($_.Exception.Message)
        {
            $result.error.message = $_.Exception.Message
        }

        if ($_.Exception.ItemName)
        {
            $result.error.itemname = $_.Exception.ItemName
        }

        if ($_.CategoryInfo.Reason)
        {
            $result.error.reason = $_.CategoryInfo.Reason
        }

        if ($_.CategoryInfo.Category)
        {
            $result.error.category = $_.CategoryInfo.Category.ToString()
        }

        if ($_.CategoryInfo.Activity)
        {
            $result.error.activity = $_.CategoryInfo.Activity
        }
                
        # Set a failed result
        $result.success = $false
    }
    
    # Return the result and conver it to json
    return $result | ConvertTo-Json
}