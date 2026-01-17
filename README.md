# 想看漫画

一个从S3兼容对象存储读取和展示漫画的网站。支持AWS S3、MinIO、阿里云OSS、腾讯云COS等所有兼容S3协议的对象存储服务。

## 功能特性

- 📚 浏览漫画列表
- 📖 查看章节列表
- 🖼️ 在线阅读漫画
- 🎨 现代化UI设计

## 项目结构

```
comic/
├── 漫画名1/
│   ├── 第1章/
│   │   ├── 001.jpg
│   │   ├── 002.jpg
│   │   └── ...
│   ├── 第2章/
│   └── ...
├── 漫画名2/
└── ...
```

## 环境配置

创建 `.env.local` 文件并配置以下环境变量：

### 基础配置（必需）

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_S3_BUCKET=comic
```

### 自定义Endpoint（可选）

如果你使用的是非AWS的S3兼容服务（如MinIO、阿里云OSS、腾讯云COS等），需要配置endpoint：

```env
# S3兼容服务的endpoint地址
AWS_S3_ENDPOINT=http://localhost:9000
# 或
AWS_S3_ENDPOINT=https://oss-cn-beijing.aliyuncs.com

# 路径风格的URL（path style），默认启用（true）
# 如果不需要path style，可以设置为false
AWS_S3_FORCE_PATH_STYLE=true

# 超时配置（可选，单位：毫秒）
AWS_S3_REQUEST_TIMEOUT=30000      # 请求超时，默认30秒
AWS_S3_CONNECTION_TIMEOUT=10000  # 连接超时，默认10秒

# SSL/TLS配置（可选）
# 如果使用自签名证书，设置为false以跳过证书验证（不推荐用于生产环境）
AWS_S3_REJECT_UNAUTHORIZED=true

# 重试次数（可选，默认3次）
AWS_S3_MAX_ATTEMPTS=3
```

### 配置示例

**AWS S3:**
```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=comic
# 不需要设置AWS_S3_ENDPOINT
# path style默认启用，如果AWS S3不需要，可以设置为false
AWS_S3_FORCE_PATH_STYLE=false
```

**MinIO:**
```env
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
AWS_S3_BUCKET=comic
AWS_S3_ENDPOINT=http://localhost:9000
AWS_S3_FORCE_PATH_STYLE=true
```

**阿里云OSS:**
```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_access_key_secret
AWS_REGION=cn-beijing
AWS_S3_BUCKET=comic
AWS_S3_ENDPOINT=https://oss-cn-beijing.aliyuncs.com
```

## 安装和运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 技术栈

- Next.js 14
- React 18
- TypeScript
- AWS SDK v3
