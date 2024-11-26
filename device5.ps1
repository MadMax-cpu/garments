while ($true) {
    # Get the current date and time in the correct format
    $now = Get-Date
    $start_time = $now.ToString("HH:mm:ss")   # Time in HH:MM:SS format
    $end_time = $now.AddSeconds(1).ToString("HH:mm:ss")  # End time (just as an example)
    $date = $now.ToString("yyyy-MM-dd")      # Date in YYYY-MM-DD format

    # Generate a random current value between 0.3 and 0.5
    $avg_current = [Math]::Round((Get-Random -Minimum 0.3 -Maximum 0.5), 6)

    # Create the data to send in the JSON format
    $jsonData = @{
        id = 5
        phase = "sewing"
        date = $date
        start_time = $start_time
        end_time = $end_time
        avg_current = $avg_current
    } | ConvertTo-Json

    # Print the JSON data to the console for debugging
    Write-Output "Sending data: $jsonData"

    # Send the data to your server
    try {
        $response = Invoke-RestMethod -Uri "http://192.168.31.58:3000/time" -Method Post -Body $jsonData -ContentType "application/json"
        Write-Output "Response: $response.StatusCode - $($response.Content)"
    } catch {
        Write-Output "Error: $_"
    }

    # Wait for 1 second before sending the next request
    Start-Sleep -Seconds 1
}
