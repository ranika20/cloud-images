# 1. שליפת VPC ו-Subnets מ-AWS
$VPC_ID = (aws ec2 describe-vpcs --region eu-central-1 --query "Vpcs[0].VpcId" --output text)
$SUBNETS = (aws ec2 describe-subnets --region eu-central-1 --query "Subnets[*].SubnetId" --output text) -split "`t"

# 2. שליפת ה-ARN של ה-Target Group הקיים (או יצירה אם לא קיים)
$TG_ARN = (aws elbv2 describe-target-groups --names cloud-image-tg --region eu-central-1 --query "TargetGroups[0].TargetGroupArn" --output text 2>$null)

if (-not $TG_ARN) {
    Write-Host "Creating Target Group..." -ForegroundColor Cyan
    $TG_ARN = (aws elbv2 create-target-group `
      --name cloud-image-tg `
      --protocol HTTP `
      --port 3000 `
      --vpc-id $VPC_ID `
      --target-type ip `
      --health-check-path "/" `
      --region eu-central-1 `
      --query "TargetGroups[0].TargetGroupArn" --output text)
} else {
    Write-Host "Target Group already exists!" -ForegroundColor Green
}

# 3. שליפת ה-ARN של ה-Load Balancer הקיים (או יצירה אם לא קיים)
$ALB_ARN = (aws elbv2 describe-load-balancers --names cloud-image-alb --region eu-central-1 --query "LoadBalancers[0].LoadBalancerArn" --output text 2>$null)

if (-not $ALB_ARN) {
    Write-Host "Creating Load Balancer..." -ForegroundColor Cyan
    # שליפת SG
    $TASK_ARN = (aws ecs list-tasks --cluster cloud-image-cluster --service-name cloud-image-task-service-k7qxb8hj --desired-status RUNNING --region eu-central-1 --query "taskArns[0]" --output text)
    $ENI = (aws ecs describe-tasks --cluster cloud-image-cluster --tasks $TASK_ARN --region eu-central-1 --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
    $SG_ID = (aws ec2 describe-network-interfaces --network-interface-ids $ENI --region eu-central-1 --query "NetworkInterfaces[0].Groups[0].GroupId" --output text)

    $ALB_ARN = (aws elbv2 create-load-balancer `
      --name cloud-image-alb `
      --subnets $SUBNETS `
      --security-groups $SG_ID `
      --region eu-central-1 `
      --query "LoadBalancers[0].LoadBalancerArn" --output text)
} else {
    Write-Host "Load Balancer already exists!" -ForegroundColor Green
}

# 4. הוספת Listener בפורט 80 במידה וחסר
$LISTENER = (aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --region eu-central-1 --query "Listeners[0].ListenerArn" --output text 2>$null)
if (-not $LISTENER) {
    Write-Host "Creating Listener on port 80..." -ForegroundColor Cyan
    aws elbv2 create-listener `
      --load-balancer-arn $ALB_ARN `
      --protocol HTTP `
      --port 80 `
      --default-actions Type=forward,TargetGroupArn=$TG_ARN `
      --region eu-central-1
} else {
    Write-Host "Listener already exists!" -ForegroundColor Green
}

# 5. הדפסת ה-DNS המוכן
$DNS = (aws elbv2 describe-load-balancers --name cloud-image-alb --region eu-central-1 --query "LoadBalancers[0].DNSName" --output text)
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "ALB Ready!" -ForegroundColor Green
Write-Host "Your ALB DNS: http://$DNS" -ForegroundColor Yellow
Write-Host "Target Group ARN: $TG_ARN" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green