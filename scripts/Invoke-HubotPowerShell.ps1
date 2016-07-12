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
        [System.Collections.Hashtable]$Splat
    )

    # Set the erroraction
    $ErrorActionPreference = 'Stop'


    # Create a hashtable for the results
    $result = @{}
    
    # Use try/catch block            
    try
    {
        $script = Get-Command $FilePath | Select-Object -ExpandProperty ScriptBlock
       
        # Use ErrorAction Stop to make sure we can catch any errors
        $scriptOutput = .$script @splat
        
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
            $result.error.category = $_.CategoryInfo.Category
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