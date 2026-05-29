# 🚀 DeployPanel

A full-stack deployment control panel for automating Docker container deployment and AWS Lambda execution. Monitor, manage, and deploy containerized applications in real-time.

**Live Demo:** [deploy-panel.onrender.com](https://deploy-panel.onrender.com)

---

## ✨ Features

- **Real-time Dashboard** - Live deployment status with auto-refresh every 3 seconds
- **Docker Container Management** - Deploy and manage Docker containers on EC2 instances
- **AWS Lambda Integration** - Trigger Lambda functions for post-deployment setup
- **Queue System** - BullMQ-based job queue with Redis for reliable deployment orchestration
- **Responsive UI** - Modern React interface with Toast notifications
- **Status Tracking** - Pending → Processing → Completed/Failed state management
- **Health Monitoring** - Backend health check endpoint with service status

---

## 🏗️ Architecture

```
┌─────────────────────┐
│  Vercel Frontend    │
│  (React + Vite)     │
└──────────┬──────────┘
           │ HTTPS
           │
┌──────────▼──────────┐
│ Render Backend      │
│ (Express.js)        │
└──────┬──────────┬───┘
       │          │
   ┌───▼───┐  ┌──▼────────┐
   │MongoDB│  │Redis/Queue│
   │ Atlas │  │ (BullMQ)   │
   └───────┘  └──┬────┬────┘
              ┌──▼─┐ ┌─▼──┐
              │EC2 │ │AWS │
              │    │ │Lmda│
              └────┘ └────┘
```

---

## 📋 Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Fast build tool
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB Atlas** - Database
- **Mongoose** - ODM
- **BullMQ** - Job queue
- **Redis** - Queue storage
- **AWS SDK** - Lambda & EC2 integration

### Infrastructure
- **Render** - Backend hosting
- **Vercel** - Frontend hosting
- **AWS EC2** - Container deployment
- **AWS Lambda** - Post-deployment automation

---

## 📁 Project Structure

```
Deploy Panel/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx      # Deployment list & status
│   │   │   ├── Form.jsx           # Deployment creation
│   │   │   └── DeploymentModal.jsx # Deployment details
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js        # MongoDB connection
│   │   ├── controllers/
│   │   │   └── DeploymentController.js
│   │   ├── models/
│   │   │   └── DeploymentModel.js
│   │   ├── routes/
│   │   │   └── DeploymentRoute.js
│   │   ├── services/
│   │   │   ├── ec2Service.js      # EC2 deployment logic
│   │   │   └── lambdaService.js   # Lambda trigger logic
│   │   ├── queues/
│   │   │   └── deployQueue.js     # BullMQ queue setup
│   │   ├── workers/
│   │   │   └── deployWorker.js    # Job processor
│   │   └── index.js               # Express app setup
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16+ and npm
- **MongoDB Atlas** account (free tier available)
- **Redis** (local or cloud)
- **AWS Account** with EC2 and Lambda access
- **Git**

### Installation

#### 1. Clone Repository
```bash
git clone <your-repo-url>
cd "Deploy Panel"
```

#### 2. Backend Setup
```bash
cd server
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
nano .env
# or use your editor to update:
# - MONGODB_URI
# - REDIS_URL
# - AWS credentials
# - FRONTEND_URL (for Vercel deployment)
```

#### 3. Frontend Setup
```bash
cd ../client
npm install

# Create .env.local for development
echo "VITE_API_URL=http://localhost:5000" > .env.local

# For production, create .env
echo "VITE_API_URL=https://deploy-panel.onrender.com" > .env
```

---

## 🏃 Running Locally

### Start Backend
```bash
cd server
npm install
npm start
# Server runs on http://localhost:5000
```

### Start Frontend (new terminal)
```bash
cd client
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Run Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-29T10:30:00.000Z",
  "uptime": 123.456,
  "services": {
    "database": "connected",
    "redis": "check worker logs",
    "queue": { "paused": false, "waiting": 0, "active": 0, "completed": 5 }
  }
}
```

---

## 📡 API Endpoints

### Deployments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/deployments` | Get all deployments |
| `GET` | `/api/deployments/:id` | Get deployment details |
| `POST` | `/api/deploy` | Create new deployment |
| `PUT` | `/api/deployments/:id` | Update deployment |
| `DELETE` | `/api/deployments/:id` | Delete deployment |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check & service status |

### Example: Create Deployment
```bash
curl -X POST http://localhost:5000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Acme Corp",
    "domain": "acme.example.com",
    "image": "nginx:latest"
  }'
```

---

## 🌐 Deployment

### Deploy to Render (Backend)

1. Create account at [render.com](https://render.com)
2. Create new **Web Service**
3. Connect GitHub repository
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add Environment Variables (see `.env.example`)
7. Deploy!

### Deploy to Vercel (Frontend)

1. Create account at [vercel.com](https://vercel.com)
2. Import project from GitHub
3. Set **Framework**: Vite
4. Add Environment Variable: `VITE_API_URL=https://your-render-app.onrender.com`
5. Deploy!

### Post-Deployment: Fix CORS

After deploying, update your Render backend environment variables:

```
FRONTEND_URL=https://your-app.vercel.app
```

Then redeploy Render service for CORS to work properly.

---

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-vercel-app.vercel.app

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/deploypanel
REDIS_URL=redis://user:pass@host:port

AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
LAMBDA_FUNCTION_NAME=deployment-post-setup

EC2_HOST=your-ec2-ip
EC2_USERNAME=ubuntu
EC2_SSH_KEY_PATH=/path/to/key.pem
MOCK_MODE=false
```

### Frontend (.env)
```
VITE_API_URL=https://deploy-panel.onrender.com
```

---

## 🔄 Deployment Workflow

1. **User submits deployment form** (Frontend)
   - Client name, domain, Docker image

2. **API creates deployment record** (Backend)
   - Stores in MongoDB with `Pending` status
   - Adds job to BullMQ queue

3. **Queue worker processes job** (Worker)
   - Status changes to `Processing`
   - SSH to EC2 instance
   - Pull & run Docker container
   - Trigger AWS Lambda

4. **Dashboard updates** (Frontend)
   - Auto-refreshes every 3 seconds
   - Shows live status updates

5. **Job completes** (Worker)
   - Status changes to `Completed` or `Failed`
   - Final logs stored in database

---

## 🛠️ Troubleshooting

### CORS Errors
- Check `FRONTEND_URL` is set in Render environment
- Ensure `VITE_API_URL` is set in Vercel build settings
- Frontend origin must match backend's allowlist

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes Render IPs
- Check connection string in `.env`
- Test locally first

### Queue Not Processing
- Ensure Redis is running/accessible
- Check Redis URL in `.env`
- Verify BullMQ is installed: `npm ls bullmq`

### Lambda Not Triggering
- Verify AWS credentials are correct
- Check Lambda function name matches `LAMBDA_FUNCTION_NAME`
- Ensure IAM role has Lambda invoke permissions

---

## 📝 Sample Deployment

```javascript
// POST /api/deploy
{
  "clientName": "Tech Startup Inc",
  "domain": "app.techstartup.com",
  "image": "node:18-alpine"
}

// Response
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "clientName": "Tech Startup Inc",
    "domain": "app.techstartup.com",
    "image": "node:18-alpine",
    "status": "Pending",
    "createdAt": "2026-05-29T10:30:00.000Z"
  }
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review `.env.example` files for configuration help

---

## 🎯 Roadmap

- [ ] Email notifications on deployment status
- [ ] Deployment rollback functionality
- [ ] Multi-region support
- [ ] Slack integration
- [ ] Advanced monitoring & analytics
- [ ] User authentication & role-based access
- [ ] Deployment history & versioning
- [ ] Scheduled deployments

---

**Built with ❤️ by Rajan
