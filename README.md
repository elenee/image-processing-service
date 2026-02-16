Image Processing Service
A production-ready microservice for image processing built with NestJS, similar to Cloudinary. Features user authentication, cloud storage, asynchronous processing, and intelligent caching.
***
🚀 Features

User Authentication: JWT-based authentication with secure password hashing
Image Upload: Upload images to AWS S3 with automatic metadata storage
Image Transformations:

Basic: Resize, Crop, Rotate, Flip, Mirror
Advanced: Format conversion, Compression, Filters (Grayscale, Sepia)


Async Processing: Background job processing with RabbitMQ

Intelligent Caching: Redis-based caching with smart invalidation

Rate Limiting: Configurable throttling to prevent abuse

Pagination: Efficient pagination for image listings

RESTful API: Clean, well-structured REST endpoints

***

🛠️ Tech Stack

Framework: NestJS 11

Language: TypeScript

Database: MongoDB (Mongoose ODM)

Cache: Redis (ioredis)

Message Queue: RabbitMQ (AMQP)

Storage: AWS S3

Image Processing: Sharp

Authentication: JWT + Bcrypt

Validation: class-validator, class-transformer

Rate Limiting: @nestjs/throttler

***

📋 Prerequisites
Before running this application, ensure you have:

Node.js (v18 or higher)

npm or yarn

MongoDB (local or MongoDB Atlas)

Docker (for Redis and RabbitMQ)

AWS Account (for S3 bucket)

***

🔧 Installation
1. Clone the repository
bashgit clone <your-repo-url>
cd image-processing-service
2. Install dependencies
bashnpm install
3. Set up environment variables
Create a .env file in the root directory:
env# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0

# JWT
JWT_SECRET=your_jwt_secret_key

# AWS S3
aws_access_key=YOUR_AWS_ACCESS_KEY
aws_secret_access_key=YOUR_AWS_SECRET_KEY
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=your-region

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

***
Start Docker services
Redis:
bashdocker run -d -p 6379:6379 --restart unless-stopped --name redis-cache redis
RabbitMQ:
bashdocker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management
Verify services are running:
bashdocker ps

🚀 Running the Application


Development mode
bashnpm run start:dev

Production mode

bashnpm run build

npm run start:prod

The application will be available at http://localhost:3000

## 🎯 Architecture Overview

Client Request
    ↓
NestJS API (Port 3000)
    ↓
├── Authentication (JWT)
├── Upload → AWS S3
├── Transform → RabbitMQ Queue → Background Worker
├── Cache → Redis
└── Database → MongoDB

**Key Design Decisions:**
- **Asynchronous Processing**: Transformations sent to RabbitMQ for background processing
- **Caching Strategy**: Redis with smart invalidation using version keys
- **Modular Architecture**: Separation of concerns for maintainability

Services:

API: http://localhost:3000

RabbitMQ Management UI: http://localhost:15672 (guest/guest)

## 📦 Available Transformations

| Transformation | Description | Example |
|---------------|-------------|---------|
| **Resize** | Change dimensions | `{ width: 800, height: 600 }` |
| **Crop** | Extract portion | `{ width: 500, height: 500, x: 0, y: 0 }` |
| **Rotate** | Rotate by degrees | `90` |
| **Flip** | Flip vertically | `true` |
| **Mirror** | Flip horizontally | `true` |
| **Format** | Convert format | `"png"`, `"jpeg"`, `"webp"` |
| **Compress** | Adjust quality | `80` (1-100) |
| **Filters** | Grayscale, Sepia | `{ grayscale: true }` |

## ⚙️ Configuration

**Rate Limiting:**
- Global: 100 requests/minute
- Image Upload: 10 uploads/minute  
- Image Transform: 5 transforms/minute

**Caching TTL:**
- Image Lists: 5 minutes
- Single Image: 10 minutes
- Transformed Images: 24 hours

**File Upload Limits:**
- Max size: 10MB
- Formats: PNG, JPEG, JPG, GIF, WEBP, BMP, TIFF


## 🔒 Security Features

- Password hashing with bcrypt
- JWT-based stateless authentication
- User ownership verification
- File type and size validation
- Rate limiting to prevent abuse
- Environment variables for sensitive data

## 👤 Author

[elenee](https://github.com/elenee)
***
⭐ If you found this project helpful, please consider giving it a star!
