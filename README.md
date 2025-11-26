# 🏥 Maemi-Chan Medical AI

Medical AI consultation system powered by FastAPI, React, and HuggingFace Bio_ClinicalBERT.

## 📦 Requirements

- **Python 3.10+**: https://www.python.org/downloads/
- **Node.js 18+**: https://nodejs.org/
- **ODBC Driver 17**: https://go.microsoft.com/fwlink/?linkid=2249006
- **SQL Server**: 2016+ or Express
- **nginx** (optional): https://nginx.org/en/download.html

---

## ⚡ Quick Start

### 1. Setup (ครั้งแรก)

```bash
# Install dependencies
pip install psutil requests python-dotenv

# Run setup
python setup.py
```

Setup auto-installs: Python packages, Node.js packages, builds frontend, creates .env

### 2. Configure

Edit `.env`:
```
DATABASE_URL=DRIVER={ODBC Driver 17 for SQL Server};SERVER=10.73.148.76,1433;DATABASE=maemi-db;UID=inn@admin;PWD=password
HUGGINGFACE_API_TOKEN=hf_your_token_here
ADMIN_PASSWORD=sdx@admin
```

---

## 🚀 Commands

```bash
# Start backend (production with 4 workers)
python start.py

# Stop backend
python stop.py

# Check status
python status.py

# Deploy
python deploy.py              # Full (frontend + backend)
python deploy.py --frontend   # Frontend only
python deploy.py --backend    # Backend only

# Update (git pull + dependencies + restart)
python update.py

# Force stop all
python force_stop.py
```

---

---

## 🌐 Access

- **Frontend**: http://10.73.148.75/maemi-chan/
- **Admin Panel**: http://10.73.148.75/maemi-chan/sdx-secret
- **API Docs**: http://localhost:4003/docs
- **Health Check**: http://localhost:4003/health
- **Metrics**: http://localhost:4003/metrics
- **Monitoring**: http://localhost:19999 (after installing Netdata)

---

## 🎯 Management Scripts

| Script | Description | Command |
|--------|-------------|---------|
| **setup.py** | ติดตั้งระบบครั้งแรก | `python setup.py` |
| **start.py** | เริ่มระบบ Backend | `python start.py` |
| **stop.py** | หยุดระบบ Backend | `python stop.py` |
| **status.py** | ตรวจสอบสถานะ | `python status.py` |
| **update.py** | อัพเดทระบบ | `python update.py` |

**Note:** nginx จะไม่ถูกหยุดโดย scripts เพื่อไม่กระทบงานอื่นบนเซิร์ฟเวอร์

---

## 📚 Documentation

- **[PRODUCTION-SETUP.md](PRODUCTION-SETUP.md)** - Production deployment guide
- **[WINDOWS-COMMANDS.md](WINDOWS-COMMANDS.md)** - Manual commands reference
- **nginx/NGINX-SETUP.md** - Shared nginx server setup
- **.env.example** - Configuration template
- **[monitoring/](monitoring/)** - Monitoring setup & AI improvements
  - 🪟 **[NETDATA-SETUP-WINDOWS.md](monitoring/NETDATA-SETUP-WINDOWS.md)** - Windows monitoring
  - 🐧 **[NETDATA-SETUP.md](monitoring/NETDATA-SETUP.md)** - Linux monitoring
  - 🤖 **[AI-IMPROVEMENTS.md](monitoring/AI-IMPROVEMENTS.md)** - AI optimization guide

---

## 📊 Monitoring (Optional)

ติดตั้ง Netdata สำหรับ real-time monitoring:

**Windows:**
```powershell
.\install-netdata.ps1
```

**Linux:**
```bash
./install-netdata.sh
```

**Features:**
- ✅ Real-time CPU, Memory, Disk, Network monitoring
- ✅ Backend performance metrics
- ✅ Beautiful dashboard at http://localhost:19999
- ✅ Free forever!

**ดูรายละเอียด**: [monitoring/README.md](monitoring/README.md)

---

## 🏗️ Project Structure

```
maemi-chan-project/
├── backend/              # FastAPI backend
│   ├── main.py          # Entry point
│   ├── config.py        # Configuration
│   ├── routes/          # API routes
│   └── services/        # Business logic
├── frontend/            # React + Vite frontend
│   ├── src/
│   ├── dist/            # Built files
│   └── vite.config.ts
├── .env                 # Configuration (DO NOT COMMIT)
├── .env.example         # Template
└── WINDOWS-COMMANDS.md  # Commands guide
```

---

## 🛠️ Common Operations

### Check System Status
```bash
python status.py
```

### Update System
```bash
python update.py
```

### Restart System
```bash
python stop.py
python start.py
```

### View Logs
```bash
# Backend logs
type .cache\logs\backend.log

# Or on Linux
tail -f .cache/logs/backend.log
```

---

## 🔍 Troubleshooting

### Scripts not working?

Install dependencies first:
```bash
pip install psutil requests python-dotenv
```

### Port already in use?

```bash
python stop.py
```

### Need detailed logs?

```bash
python status.py
# Check .cache/logs/backend.log
```

### Complete reset?

```bash
python stop.py
# Delete .venv folder
python setup.py
python start.py
```

---

## 📞 Support

- **Python Scripts**: See script output for detailed errors
- **Manual Commands**: [WINDOWS-COMMANDS.md](WINDOWS-COMMANDS.md)
- **Production Setup**: [PRODUCTION-SETUP.md](PRODUCTION-SETUP.md)
- **nginx Setup**: [nginx/NGINX-SETUP.md](nginx/NGINX-SETUP.md)

---

## 📄 License

MIT
