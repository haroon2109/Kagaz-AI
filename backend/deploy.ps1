<#
.SYNOPSIS
Deploys the Kagaz AI OCR backend to Google Cloud Run.

.DESCRIPTION
This script uses the Google Cloud SDK (gcloud) to build and deploy the Docker container to Cloud Run.
It provisions a high-memory instance specifically tailored for Computer Vision workloads like PaddleOCR and OpenCV.
#>

$ServiceName = "kagaz-ai-backend"
$Region = "us-central1"
$Memory = "4Gi"
$Cpu = "2"

Write-Host "Deploying $ServiceName to Google Cloud Run in $Region..." -ForegroundColor Cyan
Write-Host "Configuring instance with $Memory RAM and $Cpu CPUs for Computer Vision workloads." -ForegroundColor Yellow

# The source parameter points to the current directory where the Dockerfile lives.
# The Cloud Build service will automatically build the container and push it to Artifact Registry.
gcloud run deploy $ServiceName `
    --source . `
    --region $Region `
    --memory $Memory `
    --cpu $Cpu `
    --allow-unauthenticated `
    --port 8080 `
    --set-env-vars="ENV=production" `
    --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    Write-Host "Remember to set your production secrets (DATABASE_URL, GEMINI_API_KEY, etc.) in the Cloud Run Console." -ForegroundColor Yellow
} else {
    Write-Host "Deployment failed. Please ensure you are authenticated (gcloud auth login)." -ForegroundColor Red
}
