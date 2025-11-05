# 🎮 Phaser Spine Chatroom - Deploy Instructions

## ✅ Structure

This folder contains **both** the server AND client:
- `server.js` - WebSocket server
- `chat-client/` - Game client files

## 🚀 Quick Deploy to Render

### Step 1: Commit Changes

```bash
cd /home/blueday/Downloads/games-main/games/10-networked/chat-server

# Initialize git if needed
git init

# Add all files (including chat-client folder)
git add .

# Commit
git commit -m "Deploy chat server with client"
```

### Step 2: Push to GitHub

```bash
# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. **Settings:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Click "Create Web Service"

## 🌐 After Deployment

Your app will be available at:

- **Server:** `https://your-app.onrender.com/`
- **Game:** `https://your-app.onrender.com/index.html` ← Use this in your mobile WebView!
- **Health:** `https://your-app.onrender.com/health`

## 📱 Mobile WebView Integration

### Android
```java
webView.loadUrl("https://your-app.onrender.com/index.html");
```

### iOS
```swift
let url = URL(string: "https://your-app.onrender.com/index.html")!
webView.load(URLRequest(url: url))
```

## 🧪 Test Locally

```bash
cd /home/blueday/Downloads/games-main/games/10-networked/chat-server
npm install
npm start
```

Then open: `http://localhost:3000/index.html`

## ✅ Features

- ✅ WebSocket multiplayer
- ✅ Mobile touch controls (virtual joystick)
- ✅ Auto-connects to deployed server
- ✅ Works in any WebView
- ✅ HTTPS enabled on Render

## 🔄 Update Existing Deployment

If you already have a Render deployment:

1. **Push your changes to GitHub:**
   ```bash
   git add .
   git commit -m "Add chat-client to server"
   git push
   ```

2. **Render will auto-deploy!** (if you have auto-deploy enabled)

3. Or manually trigger deploy in Render dashboard

## 📝 Important Files

- `server.js` - Main server file
- `chat-client/` - All game files (copied from parent directory)
- `package.json` - Dependencies
- `render.yaml` - Render configuration (optional)

## 🎯 WebSocket URL

The client automatically connects to the correct WebSocket URL based on where it's hosted. No configuration needed!

Local: `ws://localhost:3000`
Deployed: `wss://your-app.onrender.com`

