# CRUD-DD-TASK-MEAN-APP — DevOps Deployment Documentation

A full-stack MEAN (MongoDB, Express, Angular, Node.js) CRUD application containerized with Docker and deployed on AWS EC2 using Docker Compose, Nginx reverse proxy, and GitHub Actions CI/CD pipeline.

---

## 📁 Project Structure

```
CRUD-DD-TASK-MEAN-APP/
├── .github/
│   └── workflows/
│       └── deploy.yml        ← GitHub Actions CI/CD Pipeline
├── backend/
│   ├── app/
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── angular.json
├── docker-compose.yml
├── nginx.conf
└── .gitignore
```

---

## ✅ Task 1 — GitHub Repository Setup

### What We Did:
- Created a new public GitHub repository named `mean-task-app`
- Added all project files — backend, frontend, docker-compose.yml, nginx.conf
- Pushed complete code to the `main` branch

### Commands Used:
```bash
git init
git add .
git commit -m "Initial commit - MEAN stack CRUD app"
git branch -M main
git remote add origin https://github.com/Sanyam-10/mean-task-app.git
git push -u origin main
```
<img width="1065" height="629" alt="image" src="https://github.com/user-attachments/assets/c70ab7c1-a400-4322-b623-c7cea30949eb" />


![GitHub Repository](screenshot-github-repo.png)

---

## ✅ Task 2 — Containerization with Docker

### What We Did:
- Created a `Dockerfile` for the **backend** (Node.js/Express)
- Created a `Dockerfile` for the **frontend** (Angular) using multi-stage build
- Built both Docker images locally
- Pushed both images to Docker Hub account (`ssanyam2004`)

### Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

### Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --project=angular-15-crud

FROM nginx:alpine
COPY --from=build /app/dist/angular-15-crud /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Commands Used to Build and Push:
```bash

docker login


docker build -t ssanyam2004/mean-backend:latest ./backend
docker push ssanyam2004/mean-backend:latest


docker build -t ssanyam2004/mean-frontend:latest ./frontend
docker push ssanyam2004/mean-frontend:latest
```

<img width="1387" height="618" alt="image" src="https://github.com/user-attachments/assets/0aa75a26-f27a-4495-997e-d9322c385fa7" />


![Docker Images](screenshot-docker-images.png)

---

## ✅ Task 3 — Database Setup

### What We Did:
- Used the **official MongoDB Docker image** (`mongo:6`) as part of Docker Compose
- No separate MongoDB installation needed on the VM
- MongoDB data is persisted using a Docker volume (`mongo_data`)
- Backend connects to MongoDB using environment variable `MONGO_URI`

### MongoDB Service in docker-compose.yml:
```yaml
mongodb:
  image: mongo:6
  container_name: mongodb
  restart: always
  ports:
    - "27017:27017"
  volumes:
    - mongo_data:/data/db
  networks:
    - mean_network
```

---

## ✅ Task 4 — Ubuntu VM Setup on AWS EC2 + Docker Compose Deployment

### What We Did:
- Created a new **Ubuntu 22.04 LTS** EC2 instance on AWS
- Configured Security Group with required ports
- Installed Docker and Docker Compose on the VM
- Copied `docker-compose.yml` and `nginx.conf` to the VM using `scp`
- Ran `docker-compose up -d` to start all containers

### EC2 Instance Details:

| Setting | Value |
|--------|-------|
| OS | Ubuntu 22.04 LTS |
| Instance Type | t2.micro |
| Public IP | 13.234.20.111 |

### Security Group Inbound Rules:

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | SSH | VM Access |
| 80 | HTTP | Nginx / App |
| 8080 | TCP | Backend API |

<img width="1820" height="788" alt="image" src="https://github.com/user-attachments/assets/97ebd80f-466d-40b5-8453-6a17d112f02a" />


![AWS Security Group](screenshot-security-group.png)

### Commands to Install Docker on VM:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
newgrp docker
```

### Commands to Copy Files and Deploy:
```bash

scp -i "mean-task-app.pem" docker-compose.yml ubuntu@13.234.20.111:~/
scp -i "mean-task-app.pem" nginx.conf ubuntu@13.234.20.111:~/


docker-compose up -d


docker ps
```

### Complete docker-compose.yml:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: mongodb
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - mean_network

  backend:
    image: ssanyam2004/mean-backend:latest
    container_name: backend
    restart: always
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - MONGO_URI=mongodb://mongodb:27017/cruddb
    depends_on:
      - mongodb
    networks:
      - mean_network

  frontend:
    image: ssanyam2004/mean-frontend:latest
    container_name: frontend
    restart: always
    ports:
      - "4200:80"
    depends_on:
      - backend
    networks:
      - mean_network

  nginx:
    image: nginx:alpine
    container_name: nginx_proxy
    restart: always
    ports:
      - "80:80"
    volumes:
      - /home/ubuntu/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend
    networks:
      - mean_network

volumes:
  mongo_data:

networks:
  mean_network:
    driver: bridge
```

<img width="1919" height="637" alt="image" src="https://github.com/user-attachments/assets/240c1511-e158-4e85-976b-2273de9d2307" />


![Docker PS](screenshot-docker-ps.png)

---

## ✅ Task 5 — Nginx Reverse Proxy

### What We Did:
- Set up **Nginx as a reverse proxy** inside Docker
- All traffic on **Port 80** is handled by Nginx
- `/` route → forwards to Angular frontend container
- `/api/` route → forwards to Node.js backend container
- Application is fully accessible via port 80 (no need to expose other ports)

### nginx.conf:
```nginx
events {}

http {
    server {
        listen 80;

        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/ {
            proxy_pass http://backend:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```


<img width="1742" height="874" alt="image" src="https://github.com/user-attachments/assets/64bf05b9-48b3-42dd-b535-da1acfa0c44a" />

![App Running](screenshot-app-running.png)

---

## ✅ Task 6 — CI/CD Pipeline with GitHub Actions

### What We Did:
- Created a GitHub Actions workflow file at `.github/workflows/deploy.yml`
- Pipeline triggers automatically on every `git push` to `main` branch
- Pipeline does 3 things automatically:
  1. Builds updated Docker images
  2. Pushes them to Docker Hub
  3. SSHs into the EC2 VM and restarts containers with latest images

### GitHub Secrets Configured:

| Secret Name | What It Contains |
|-------------|-----------------|
| `DOCKER_USERNAME` | `ssanyam2004` |
| `DOCKER_PASSWORD` | Docker Hub password |
| `VM_HOST` | `13.234.20.111` |
| `VM_USER` | `ubuntu` |
| `VM_SSH_KEY` | Contents of `mean-task-app.pem` file |

### deploy.yml:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push backend
        run: |
          docker build -t ${{ secrets.DOCKER_USERNAME }}/mean-backend:latest ./backend
          docker push ${{ secrets.DOCKER_USERNAME }}/mean-backend:latest

      - name: Build and push frontend
        run: |
          cd frontend
          npm install
          npm run build -- --project=angular-15-crud
          cat > Dockerfile.ci << 'DOCKERFILE'
          FROM nginx:alpine
          COPY dist/angular-15-crud /usr/share/nginx/html
          EXPOSE 80
          CMD ["nginx", "-g", "daemon off;"]
          DOCKERFILE
          docker build -t ${{ secrets.DOCKER_USERNAME }}/mean-frontend:latest -f Dockerfile.ci .
          docker push ${{ secrets.DOCKER_USERNAME }}/mean-frontend:latest

      - name: Deploy to VM
        uses: appleboy/ssh-action@v0.1.10
        with:
          host: ${{ secrets.VM_HOST }}
          username: ${{ secrets.VM_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          script: |
            cd ~/
            docker-compose pull
            docker-compose down
            docker-compose up -d
            docker image prune -f
```

### Pipeline Flow:
```
Code push to GitHub (main branch)
           ↓
   Checkout latest code
           ↓
   Login to Docker Hub
           ↓
Build & Push Backend Image → Docker Hub
           ↓
Build & Push Frontend Image → Docker Hub
           ↓
   SSH into AWS EC2 VM
           ↓
docker-compose pull (latest images)
           ↓
docker-compose down → up -d
           ↓
  App updated automatically ✅
```

<img width="1883" height="799" alt="image" src="https://github.com/user-attachments/assets/d35426d2-d77a-4cc0-8383-eca55b165711" />


![GitHub Actions Pipeline](screenshot-github-actions.png)

---

## 🌐 Live Application URLs

| Service | URL |
|---------|-----|
| Frontend (Angular App) | http://13.234.20.111 |
| Backend API | http://13.234.20.111:8080 |
| MongoDB | Port 27017 (internal only) |

---

## 🛠️ Complete Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 15 |
| Backend | Node.js + Express |
| Database | MongoDB 6 (Docker) |
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| Cloud Platform | AWS EC2 (Ubuntu 22.04) |
| CI/CD | GitHub Actions |
| Container Registry | Docker Hub |

