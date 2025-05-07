FROM public.ecr.aws/lambda/python:3.11

# Installer les dépendances
COPY requirements.txt .
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copier le modèle et le handler
COPY all-MiniLM-L6-v2 ${LAMBDA_TASK_ROOT}/all-MiniLM-L6-v2
COPY lambda_function.py ${LAMBDA_TASK_ROOT}

# Définir le handler
CMD ["lambda_function.lambda_handler"]
