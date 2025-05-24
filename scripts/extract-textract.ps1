$JobId = "4563c3c04c06be0db0b61a1cb77239669974164b34d86a3478db02f9a55961b6"
$Region = "eu-west-3"
$NextToken = $null
$OutputFile = "extracted_text.txt"
$AWS = "C:\Program Files\Amazon\AWSCLIV2\aws.exe" 

# Clear output file
Set-Content -Path $OutputFile -Value ""

do {
    if ($null -eq $NextToken) {
        $responseJson = & $AWS textract get-document-text-detection `
            --job-id $JobId `
            --region $Region | ConvertFrom-Json
    } else {
        $responseJson = & $AWS textract get-document-text-detection `
            --job-id $JobId `
            --region $Region `
            --next-token $NextToken | ConvertFrom-Json
    }

    foreach ($block in $responseJson.Blocks) {
        if ($block.BlockType -eq "LINE") {
            Add-Content -Path $OutputFile -Value $block.Text
        }
    }

    $NextToken = $responseJson.NextToken

} while ($NextToken)

Write-Host "`n✅ Done! All pages saved to $OutputFile"
