#!/bin/bash

# Charger les clés depuis aws_keys.env
source ./aws_keys.env

# Configurer AWS CLI pour lambda-user
aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID --profile lambda-user
aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY --profile lambda-user
aws configure set region ca-central-1 --profile lambda-user

echo "✅  AWS CLI configured with lambda-user profile."
