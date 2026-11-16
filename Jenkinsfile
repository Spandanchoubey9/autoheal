
pipeline {
    agent any

    environment {
        AWS_REGION     = 'us-east-1'
        AWS_ACCOUNT_ID = '143765648738'
        ECR_REGISTRY   = '143765648738.dkr.ecr.us-east-1.amazonaws.com'
        BACKEND_REPO   = 'autoheal-backend'
        FRONTEND_REPO  = 'autoheal-frontend'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Backend') {
            steps {
                sh '''
                    docker build \
                      -t $ECR_REGISTRY/$BACKEND_REPO:build-$BUILD_NUMBER \
                      ./backend
                '''
            }
        }

        stage('Build Frontend') {
            steps {
                sh '''
                    docker build \
                      -t $ECR_REGISTRY/$FRONTEND_REPO:build-$BUILD_NUMBER \
                      ./frontend
                '''
            }
        }

        stage('Login to AWS ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region $AWS_REGION | \
                    docker login \
                      --username AWS \
                      --password-stdin $ECR_REGISTRY
                '''
            }
        }

        stage('Push Images to ECR') {
            steps {
                sh '''
                    docker push \
                      $ECR_REGISTRY/$BACKEND_REPO:build-$BUILD_NUMBER

                    docker push \
                      $ECR_REGISTRY/$FRONTEND_REPO:build-$BUILD_NUMBER
                '''
            }
        }
    }

    post {
        success {
            echo 'AutoHeal images successfully pushed to AWS ECR.'
        }
        failure {
            echo 'AutoHeal CI/CD pipeline failed. Check the console output.'
        }
        always {
            sh 'docker logout $ECR_REGISTRY || true'
        }
    }
}
