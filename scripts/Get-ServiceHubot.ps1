<#
.Synopsis
    Gets service status for Hubot Script.
.DESCRIPTION
    Gets service status for Hubot Script.
.EXAMPLE
    Get-ServiceHubot -Name dhcp
#>
function Get-ServiceHubot
{
    [CmdletBinding()]
    Param
    (
        # Name of the Service
        [Parameter(Mandatory=$true)]
        $Name
    )

    # Create a hashtable for the results
    $result = @{}
    
    # Use try/catch block            
    try
    {
        # Use ErrorAction Stop to make sure we can catch any errors
        $service = Get-Service -Name $Name -ErrorAction Stop
        
        # Create a string for sending back to slack. * and ` are used to make the output look nice in Slack. Details: http://bit.ly/MHSlackFormat
        $result.output = "Service $($service.Name) (*$($service.DisplayName)*) is currently ``$($service.Status.ToString())``."
        
        # Set a successful result
        $result.success = $true
    }
    catch
    {
        # If this script fails we can assume the service did not exist
        $result.output = "Service $($Name) does not exist on this server."
        
        # Set a failed result
        $result.success = $false
    }
    
    # Return the result and conver it to json
    return $result | ConvertTo-Json
}