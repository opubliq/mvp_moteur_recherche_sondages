FROM python:3.10-slim

SHELL ["/bin/bash", "-c"]

WORKDIR /app

COPY requirements.txt .

RUN apt-get update && \
    apt-get install -y \
    r-base \
    curl \
    git \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN pip install -r requirements.txt


COPY api ./api
COPY matching ./matching
COPY viz ./viz
COPY models ./models

# Install Zsh, Oh My Zsh and Powerlevel10k
RUN git clone https://github.com/ohmyzsh/ohmyzsh.git ~/.oh-my-zsh && \
    cp ~/.oh-my-zsh/templates/zshrc.zsh-template ~/.zshrc && \
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ~/.oh-my-zsh/custom/themes/powerlevel10k && \
    echo 'ZSH_THEME="powerlevel10k/powerlevel10k"' >> ~/.zshrc

SHELL ["/bin/zsh", "-c"]

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
