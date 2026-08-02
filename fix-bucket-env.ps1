$CLUSTER = "cloud-image-cluster"
$SERVICE = "cloud-image-task-service-k7qxb8hj"

Write-Host "Fetching current Task Definition..." -ForegroundColor Cyan
$TASK_DEF_ARN = (aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region eu-central-1 --query "services[0].taskDefinition" --output text)
$TASK_DEF = (aws ecs describe-task-definition --task-definition $TASK_DEF_ARN --region eu-central-1 --query "taskDefinition" | ConvertFrom-Json)

# עדכון משתנה הסביבה בזיכרון
$container = $TASK_DEF.containerDefinitions[0]
$envArray = @()
if ($container.environment) {
    $envArray = @($container.environment | Where-Object { $_.name -ne "AWS_BUCKET_NAME" })
}
$envArray += @{ name = "AWS_BUCKET_NAME"; value = "aws.nodejs-course" }
$container.environment = $envArray

# המרת ה-Container Definition למחרוזת JSON נקייה בפורמט ש-AWS CLI מקבל
$containersJson = ($TASK_DEF.containerDefinitions | ConvertTo-Json -Depth 10 -Compress).Replace('"', '\"')

Write-Host "Registering updated Task Definition..." -ForegroundColor Cyan
$NEW_TASK_ARN = (aws ecs register-task-definition `
  --family $TASK_DEF.family `
  --task-role-arn $TASK_DEF.taskRoleArn `
  --execution-role-arn $TASK_DEF.executionRoleArn `
  --network-mode $TASK_DEF.networkMode `
  --requires-compatibilities $TASK_DEF.requiresCompatibilities `
  --cpu $TASK_DEF.cpu `
  --memory $TASK_DEF.memory `
  --container-definitions "$containersJson" `
  --region eu-central-1 `
  --query "taskDefinition.taskDefinitionArn" --output text)

Write-Host "Registered New Task: $NEW_TASK_ARN" -ForegroundColor Green

Write-Host "Updating ECS Service with Force Deployment..." -ForegroundColor Yellow
aws ecs update-service `
  --cluster $CLUSTER `
  --service $SERVICE `
  --task-definition $NEW_TASK_ARN `
  --force-new-deployment `
  --region eu-central-1

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "SUCCESSFULLY UPDATED TASK DEFINITION!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green