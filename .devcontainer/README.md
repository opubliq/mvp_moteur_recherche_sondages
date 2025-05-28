### 📦 Déploiement Docker sur DigitalOcean (App Platform)

#### 1. Build de l’image localement

```bash
docker build -t fullstack-embedding-app .
```

#### 2. Tag de l’image pour le Container Registry DigitalOcean

```bash
docker tag fullstack-embedding-app registry.digitalocean.com/opubliq/fullstack-embedding
```

#### 3. Authentification avec le registry

```bash
doctl registry login
```

> ⚠️ Nécessite un token API configuré avec `doctl auth init`

#### 4. Push de l’image vers le Container Registry

```bash
docker push registry.digitalocean.com/opubliq/fullstack-embedding
```

#### 5. Création de l’app

* Aller sur [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
* Cliquer sur **Create App**
* Choisir **Container Registry**
* Sélectionner `opubliq/fullstack-embedding:latest`

#### 6. Configuration dans App Platform

* Port HTTP : `8080`
* Run command :
  `uvicorn api.main:app --host 0.0.0.0 --port 8080`
