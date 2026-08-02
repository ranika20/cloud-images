$REGION = "eu-central-1"
$ACCOUNT_ID = "929702667798"
$ECR_REPO = "cloud-images"
$CLUSTER_NAME = "cloud-image-cluster"
$SERVICE_NAME = "cloud-image-task-service-k7qxb8hj"
$ECR_URI = "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO"

Write-Host "1/4: Connecting to ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

Write-Host "`n2/4: Building clean Docker image..." -ForegroundColor Cyan
docker build --no-cache -t $ECR_REPO .

Write-Host "`n3/4: Tagging and pushing image to ECR..." -ForegroundColor Cyan
docker tag "${ECR_REPO}:latest" "${ECR_URI}:latest"
docker push "${ECR_URI}:latest"

Write-Host "`n4/4: Forcing ECS deployment to load new image..." -ForegroundColor Cyan
aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment --region $REGION

Write-Host "`nDone! Deployment started. Give ECS 1-2 minutes to roll out." -ForegroundColor Green