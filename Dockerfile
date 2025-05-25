FROM python:3.10-slim

SHELL ["/bin/bash", "-c"]

WORKDIR /app

COPY requirements.txt .

RUN apt-get update && \
    apt-get install -y \
    r-base \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN pip install -r requirements.txt


COPY api ./api

# Install Zsh, Oh My Zsh and Powerlevel10k
RUN apt-get update && apt-get install -y zsh wget git && \
    sh -c "$(wget https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh -O -)" "" --unattended && \
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ~/.oh-my-zsh/custom/themes/powerlevel10k && \
    echo 'ZSH_THEME="powerlevel10k/powerlevel10k"' >> ~/.zshrc

SHELL ["/bin/zsh", "-c"]

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
