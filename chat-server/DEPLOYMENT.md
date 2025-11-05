# Deployment Guide

This guide covers deploying the Phaser Spine Chatroom server to various cloud platforms.

## Prerequisites

- Node.js 16+ installed locally
- Git repository (for most platforms)
- Account on your chosen cloud provider

---

## 🚀 Quick Deploy Options

### 1. Render (Recommended for Beginners)

**Pros:** Free tier, automatic HTTPS, built-in WebSocket support

1. Push your code to GitHub/GitLab
2. Go to [render.com](https://render.com) and sign up
3. Click "New +" → "Web Service"
4. Connect your repository
5. Configure:
   - **Name:** phaser-chatroom-server
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Starter for production)
6. Add environment variable (optional):
   - `NODE_ENV=production`
7. Click "Create Web Service"

**Your server will be available at:** `https://your-service-name.onrender.com`

---

### 2. Railway

**Pros:** Simple CLI, generous free tier, excellent DX

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Get URL
railway domain
```

**Alternative:** Use the Railway dashboard to deploy from GitHub.

---

### 3. Heroku

**Pros:** Well-documented, reliable (paid only now)

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create your-app-name

# Deploy
git push heroku main

# Open in browser
heroku open
```

**Note:** Heroku requires a credit card (no free tier since 2022).

---

### 4. DigitalOcean App Platform

**Pros:** Predictable pricing ($5/mo), good performance

1. Go to [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)
2. Create new app from GitHub
3. Select your repository
4. Configure:
   - **Build Command:** `npm install`
   - **Run Command:** `npm start`
   - **HTTP Port:** 3000
5. Choose a plan (Basic $5/mo recommended)
6. Launch app

---

### 5. Docker Deployment (Any Platform)

For platforms that support Docker (AWS ECS, Google Cloud Run, Azure Container Apps, etc.):

```bash
# Build image
docker build -t phaser-chatroom-server .

# Test locally
docker run -p 3000:3000 phaser-chatroom-server

# Tag and push to your registry
docker tag phaser-chatroom-server your-registry/phaser-chatroom-server
docker push your-registry/phaser-chatroom-server
```

---

## 🔧 Environment Variables

Set these on your cloud platform:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP port (auto-set by most platforms) |
| `HTTPS_PORT` | 3443 | HTTPS port (optional) |
| `NODE_ENV` | development | Set to `production` for production |

---

## ⚙️ Platform-Specific Configuration

### WebSocket Requirements

All recommended platforms support WebSockets out of the box. However:

- **Heroku:** Works on all dynos
- **Render:** Works on all plans (including free)
- **Railway:** Full WebSocket support
- **DigitalOcean:** Full support
- **AWS/GCP/Azure:** Requires proper load balancer configuration

### HTTPS/SSL

Most platforms provide automatic HTTPS:
- ✅ Render: Automatic Let's Encrypt SSL
- ✅ Railway: Automatic SSL
- ✅ Heroku: Automatic SSL
- ✅ DigitalOcean: Automatic SSL

**Note:** Your `server.js` includes optional HTTPS support with self-signed certificates. For production, let your cloud platform handle SSL termination instead.

---

## 🧪 Testing Your Deployment

After deployment:

1. **Test HTTP endpoint:**
   ```bash
   curl https://your-app-url.com/health
   # Should return: OK
   ```

2. **Test WebSocket connection:**
   ```bash
   # Update SERVER_URL in test-client.js
   SERVER_URL=wss://your-app-url.com node test-client.js
   ```

3. **Check logs:**
   - Render: View in dashboard
   - Railway: `railway logs`
   - Heroku: `heroku logs --tail`

---

## 📊 Scaling Considerations

### For High Traffic:

1. **Horizontal Scaling:**
   - Multiple instances require sticky sessions
   - Consider Redis for shared state
   - Use Redis Pub/Sub for cross-instance messaging

2. **Vertical Scaling:**
   - Upgrade to larger instances on your platform
   - Monitor CPU/Memory usage

3. **Database:**
   - Current implementation has no persistence
   - Add PostgreSQL/MongoDB for user data
   - Add Redis for session management

---

## 🔒 Security Checklist

Before production deployment:

- [ ] Set `NODE_ENV=production`
- [ ] Enable rate limiting (consider adding `express-rate-limit`)
- [ ] Add authentication if needed
- [ ] Configure CORS appropriately
- [ ] Monitor error logs
- [ ] Set up uptime monitoring (UptimeRobot, Better Uptime, etc.)
- [ ] Add DDoS protection (Cloudflare)

---

## 🚨 Troubleshooting

### WebSocket Connection Fails

1. Check that your platform supports WebSocket (all recommended ones do)
2. Ensure you're using `wss://` (not `ws://`) for HTTPS deployments
3. Check firewall rules
4. Verify the server is listening on the correct PORT

### Server Crashes

1. Check logs for errors
2. Verify Node.js version compatibility (`node >= 16`)
3. Ensure dependencies are installed
4. Check memory limits on your plan

### High Latency

1. Choose a server region close to your users
2. Consider using a CDN for static assets
3. Implement the batched updates in `server.js` (already done)
4. Monitor network performance

---

## 📚 Additional Resources

- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [WebSocket on Heroku](https://devcenter.heroku.com/articles/node-websockets)

---

## 💡 Recommended Setup

For production use:

1. **Start with Render Free Tier** to test
2. Upgrade to Railway or Render paid plan for better performance
3. Add Redis for session management when scaling
4. Use Cloudflare for CDN and DDoS protection
5. Set up monitoring and alerts

**Estimated Monthly Cost:**
- Small scale (< 100 concurrent users): $5-15/month
- Medium scale (< 1000 concurrent users): $25-50/month
- Large scale: Custom solution with load balancing

