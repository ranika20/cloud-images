# 1. שליפת שם ה-Container המדויק מתוך ה-Task Definition ב-AWS
$TASK_DEF = (aws ecs describe-services --cluster cloud-image-cluster --services cloud-image-task-service-k7qxb8hj --region eu-central-1 --query "services[0].taskDefinition" --output text)
$CONTAINER_NAME = (aws ecs describe-task-definition --task-definition $TASK_DEF --region eu-central-1 --query "taskDefinition.containerDefinitions[0].name" --output text)

Write-Host "Found Container Name: $CONTAINER_NAME" -ForegroundColor Cyan

# 2. ה-ARN של ה-Target Group שהקמנו
$TG_ARN = "arn:aws:elasticloadbalancing:eu-central-1:929702667798:targetgroup/cloud-image-tg/ae4e3b22db0533b0"

# 3. עדכון ה-Service להריץ 2 Tasks מאחורי ה-Load Balancer
Write-Host "Updating ECS Service to 2 Tasks behind ALB..." -ForegroundColor Yellow

aws ecs update-service `
  --cluster cloud-image-cluster `
  --service cloud-image-task-service-k7qxb8hj `
  --desired-count 2 `
  --load-balancers "targetGroupArn=$TG_ARN,containerName=$CONTAINER_NAME,containerPort=3000" `
  --region eu-central-1

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "ECS Service successfully connected to ALB!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green